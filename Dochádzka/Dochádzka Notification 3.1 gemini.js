// ==============================================
// ACTION SCRIPT - DOCHÁDZKA NOTIFIKÁCIE
// Verzia: 3.1 | Typ: Action Script
// Knižnica: Dochádzka
// Autor: Refactored by AI Assistant
// ==============================================
// ✅ NOVÉ v3.1 - OPRAVA NAČÍTANIA API KĽÚČOV:
// - Spolieha sa na opravenú MementoUtils knižnicu
// - Správne volanie funkcie getApiKey pre flexibilnú štruktúru API knižnice
// - Pridané robustné logovanie pre overenie načítania tokenu
//
// ✅ NOVÉ v3.0 - REFAKTORING S MEMENTOUTILS:
// - Využíva MementoUtils v2.2 pre všetky utility funkcie
// - Štruktúra kódu podľa vzoru Dochádzka Prepočet v3.2
// - Dynamické správy obsahujú iba polia a atribúty s hodnotou
// ==============================================

function hlavnaFunkcia() {
    var utils = MementoUtils;
    var currentEntry = entry();

    // Konfigurácia
    var CONFIG = {
        version: "3.1",
        scriptName: "Dochádzka Notifikácie",
        defaultsLibrary: "ASISTANTO Defaults",
        apiLibrary: "ASISTANTO API",
        fields: {
            zamestnanci: "Zamestnanci",
            datum: "Dátum",
            prichod: "Príchod",
            odchod: "Odchod",
            poznamka: "Poznámka",
            pracovnaDoba: "Pracovná doba",
            info: "info",
            debugLog: "Debug_Log",
            errorLog: "Error_Log"
        },
        attributes: {
            hodinovka: "hodinovka",
            priplatok: "+príplatok (€/h)",
            premia: "+prémia (€)",
            pokuta: "-pokuta (€)",
            dennaMzda: "denná mzda",
            poznamka: "poznámka"
        }
    };

    // ==============================================
    // POMOCNÉ FUNKCIE (zostávajú nezmenené)
    // ==============================================

    function getNazovFirmy() {
        // ... (kód je rovnaký ako vo verzii 3.0)
        utils.addDebug(currentEntry, "🏢 Načítavam názov firmy...", { location: "getNazovFirmy" });
        try {
            var defaultsLib = libByName(CONFIG.defaultsLibrary);
            if (!defaultsLib) {
                utils.addError(currentEntry, "Knižnica " + CONFIG.defaultsLibrary + " nenájdená.", "getNazovFirmy");
                return "Default Firma";
            }
            var defaultsEntry = defaultsLib.entries()[0];
            if (!defaultsEntry) {
                utils.addError(currentEntry, "Žiadne záznamy v " + CONFIG.defaultsLibrary, "getNazovFirmy");
                return "Default Firma";
            }
            var nazov = utils.safeGet(defaultsEntry, "Názov firmy", "Default Firma");
            utils.addDebug(currentEntry, "✅ Názov firmy: " + nazov, { location: "getNazovFirmy" });
            return nazov;
        } catch (e) {
            utils.addError(currentEntry, e, "getNazovFirmy");
            return "Default Firma";
        }
    }

    function vytvorTelegramSpravu(dochadzka, zamestnanec, zamestnanecIndex, firmaNazov) {
        // ... (kód je rovnaký ako vo verzii 3.0)
        var celeMeno = utils.formatEmployeeName(zamestnanec) || "Zamestnanec";
        var sprava = "🏢 **Evidencia dochádzky**\n\n";
        sprava += "Dobrý deň **" + celeMeno + "**,\n\n";
        var datum = utils.safeGet(dochadzka, CONFIG.fields.datum);
        if (datum) { sprava += "📅 Dátum: **" + moment(datum).format("DD.MM.YYYY") + "**\n"; }
        var prichod = utils.safeGet(dochadzka, CONFIG.fields.prichod);
        if (prichod) { sprava += "🕐 Príchod: **" + utils.formatTime(prichod) + "**\n"; }
        var odchod = utils.safeGet(dochadzka, CONFIG.fields.odchod);
        if (odchod) { sprava += "🕐 Odchod: **" + utils.formatTime(odchod) + "**\n"; }
        var pracovnaDoba = utils.safeGet(dochadzka, CONFIG.fields.pracovnaDoba, 0);
        if (pracovnaDoba > 0) { sprava += "⏱️ Pracovná doba: **" + pracovnaDoba.toFixed(2) + " h**\n"; }
        var mzdoveUdaje = [];
        var hodinovka = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.hodinovka, 0);
        if (hodinovka) mzdoveUdaje.push("• Hodinovka: " + utils.formatMoney(hodinovka, "€/h"));
        var priplatok = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.priplatok, 0);
        if (priplatok) mzdoveUdaje.push("• Príplatok: " + utils.formatMoney(priplatok, "€/h"));
        var premia = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.premia, 0);
        if (premia) mzdoveUdaje.push("• Prémia: **" + utils.formatMoney(premia) + "**");
        var pokuta = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.pokuta, 0);
        if (pokuta) mzdoveUdaje.push("• Pokuta: **-" + utils.formatMoney(pokuta) + "**");
        var dennaMzda = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.dennaMzda, 0);
        if (dennaMzda) mzdoveUdaje.push("• Denná mzda: **" + utils.formatMoney(dennaMzda) + "**");
        if (mzdoveUdaje.length > 0) { sprava += "\n💰 **Mzdové údaje:**\n" + mzdoveUdaje.join("\n"); }
        var poznamkaZaznam = utils.safeGet(dochadzka, CONFIG.fields.poznamka, "");
        if (poznamkaZaznam) { sprava += "\n\n📝 **Poznámka zo záznamu:**\n_" + poznamkaZaznam + "_"; }
        var poznamkaAtribut = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.poznamka, "");
        if (poznamkaAtribut) { sprava += "\n\n📝 **Poznámka zamestnanca:**\n_" + poznamkaAtribut + "_"; }
        sprava += "\n\n---\n" + firmaNazov + " | " + moment().format("DD.MM.YYYY HH:mm");
        return sprava;
    }

    function vytvorSmsSpravu(dochadzka, zamestnanec, zamestnanecIndex, firmaNazov) {
        // ... (kód je rovnaký ako vo verzii 3.0)
        var nick = utils.safeGet(zamestnanec, "Nick") || utils.safeGet(zamestnanec, "Meno") || "Zamestnanec";
        var sprava = "Ahoj " + nick + ", dochádzka " + moment(utils.safeGet(dochadzka, CONFIG.fields.datum)).format("DD.MM") + ": ";
        var prichod = utils.safeGet(dochadzka, CONFIG.fields.prichod);
        var odchod = utils.safeGet(dochadzka, CONFIG.fields.odchod);
        if (prichod && odchod) { sprava += utils.formatTime(prichod) + "-" + utils.formatTime(odchod); } 
        else if (prichod) { sprava += "príchod " + utils.formatTime(prichod); }
        var dennaMzda = utils.safeGetAttribute(dochadzka, CONFIG.fields.zamestnanci, zamestnanecIndex, CONFIG.attributes.dennaMzda, 0);
        if (dennaMzda) { sprava += ", Mzda: " + utils.formatMoney(dennaMzda); }
        sprava += ". " + firmaNazov;
        return sprava;
    }

    function vytvorEmailSpravu(dochadzka, zamestnanec, zamestnanecIndex, firmaNazov) {
        // ... (kód je rovnaký ako vo verzii 3.0)
        var telegramSprava = vytvorTelegramSpravu(dochadzka, zamestnanec, zamestnanecIndex, firmaNazov);
        return telegramSprava.replace(/\*\*/g, "").replace(/_/g, "");
    }

    function posliNotifikacieZamestnancovi(dochadzka, zamestnanec, index, apiKeys, firmaNazov) {
        // ... (kód je rovnaký ako vo verzii 3.0)
        var meno = utils.formatEmployeeName(zamestnanec);
        var uspesnePoslane = 0;
        var celkovePokusy = 0;
        utils.addDebug(currentEntry, "👤 Spracovávam notifikácie pre: " + meno, { location: "posliNotifikacie" });
        if (utils.safeGet(zamestnanec, "telegram", false)) {
            var chatId = utils.safeGet(zamestnanec, "Telegram ID", "");
            if (chatId && apiKeys.telegramToken) {
                celkovePokusy++;
                var telegramSprava = vytvorTelegramSpravu(dochadzka, zamestnanec, index, firmaNazov);
                if (utils.sendTelegramMessage(chatId, telegramSprava, apiKeys.telegramToken, "Markdown", currentEntry)) {
                    uspesnePoslane++;
                    utils.addDebug(currentEntry, "✅ Telegram notifikácia úspešne odoslaná pre " + meno);
                } else {
                    utils.addError(currentEntry, "Zlyhalo odoslanie Telegram notifikácie pre " + meno, "posliNotifikacie");
                }
            } else {
                utils.addDebug(currentEntry, "⚠️ Telegram notifikácia preskočená pre " + meno + " (chýba Chat ID alebo API token).");
            }
        }
        if (utils.safeGet(zamestnanec, "sms", false)) {
             var telefon = utils.safeGet(zamestnanec, "Mobil", "");
             if (telefon) {
                celkovePokusy++;
                var smsSprava = vytvorSmsSpravu(dochadzka, zamestnanec, index, firmaNazov);
                message("SMS pre " + meno + " ("+telefon+"): " + smsSprava);
                uspesnePoslane++;
                utils.addDebug(currentEntry, "✅ SMS notifikácia (simulácia) pre " + meno + " na číslo " + telefon);
             } else {
                utils.addDebug(currentEntry, "⚠️ SMS notifikácia preskočená pre " + meno + " (chýba mobil).");
             }
        }
        if (utils.safeGet(zamestnanec, "email", false)) {
            var email = utils.safeGet(zamestnanec, "Email", "");
            if (email) {
                celkovePokusy++;
                var emailSprava = vytvorEmailSpravu(dochadzka, zamestnanec, index, firmaNazov);
                message("Email pre " + meno + " ("+email+"): " + emailSprava);
                uspesnePoslane++;
                utils.addDebug(currentEntry, "✅ Email notifikácia (simulácia) pre " + meno + " na adresu " + email);
            } else {
                 utils.addDebug(currentEntry, "⚠️ Email notifikácia preskočená pre " + meno + " (chýba email).");
            }
        }
        return { success: uspesnePoslane > 0, sent: uspesnePoslane, attempts: celkovePokusy };
    }


    // ==============================================
    // MAIN SCRIPT EXECUTION
    // ==============================================
    try {
        utils.clearLogs(currentEntry, false);
        utils.addDebug(currentEntry, "🚀 === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // KROK 1: Načítanie konfigurácie
        var firmaNazov = getNazovFirmy();
        
        // --- OPRAVENÁ SEKCIA ---
        utils.addDebug(currentEntry, "🔑 Načítavam Telegram API token z knižnice '" + CONFIG.apiLibrary + "'...", { location: "main" });
        var telegramToken = utils.getApiKey("Telegram", CONFIG.apiLibrary, currentEntry);
        
        if (!telegramToken) {
            utils.addDebug(currentEntry, "⚠️ Telegram API token nebol nájdený. Notifikácie na Telegram budú preskočené.", { location: "main" });
        } else {
            utils.addDebug(currentEntry, "✅ Telegram API token úspešne načítaný.", { location: "main" });
        }
        // -------------------------
        
        var apiKeys = { telegramToken: telegramToken };

        // KROK 2: Načítanie zamestnancov
        var zamestnanci = utils.safeGetLinks(currentEntry, CONFIG.fields.zamestnanci);
        if (!zamestnanci || zamestnanci.length === 0) {
            utils.addError(currentEntry, "V zázname nie sú priradení žiadni zamestnanci.", "main");
            message("❌ Žiadni zamestnanci v zázname.");
            return;
        }
        utils.addDebug(currentEntry, "👥 Nájdených " + zamestnanci.length + " zamestnancov na spracovanie.");

        // KROK 3: Odoslanie notifikácií
        var celkomUspesnych = 0;
        var celkomPokusov = 0;
        
        for (var i = 0; i < zamestnanci.length; i++) {
            var zamestnanec = zamestnanci[i];
            if (zamestnanec) {
                var vysledok = posliNotifikacieZamestnancovi(currentEntry, zamestnanec, i, apiKeys, firmaNazov);
                if (vysledok.success) {
                    celkomUspesnych++;
                }
                celkomPokusov += vysledok.attempts;
            }
        }

        // KROK 4: Finálny report
        var pocetSpracovanych = zamestnanci.length;
        var vysledokSprava = "📧 NOTIFIKÁCIE v" + CONFIG.version + " DOKONČENÉ\n\n" +
            "✅ Opravené s MementoUtils v" + utils.version + "\n" +
            "🏢 Názov firmy: " + firmaNazov + "\n" +
            "📊 Výsledok: " + celkomUspesnych + "/" + pocetSpracovanych + " zamestnancov obdržalo aspoň 1 notifikáciu.\n" +
            "📤 Celkovo odoslaných pokusov: " + celkomPokusov;

        utils.safeSet(currentEntry, CONFIG.fields.info, vysledokSprava);
        message("🎉 " + vysledokSprava);
        utils.addDebug(currentEntry, "🏁 === KONIEC " + CONFIG.scriptName + " ===");

    } catch (criticalError) {
        utils.addError(currentEntry, criticalError, "MAIN-CRITICAL");
        message("💥 KRITICKÁ CHYBA!\n\n" + criticalError.toString() + "\n\nSkontroluj Error_Log.");
    } finally {
        utils.saveLogs(currentEntry);
    }
}

// Spustenie hlavnej funkcie
hlavnaFunkcia();

