// ==============================================
// MEMENTO DATABASE - DENNÝ REPORT MERGE DUPLICATES
// Verzia: 1.0.0 | Dátum: 2026-03-20 | Autor: ASISTANTO
// Knižnica: Denný report | Typ: Action (Manual)
// ==============================================
// 📋 ÚČEL:
//    - Vyhľadá duplicitné záznamy v Dennom reporte (rovnaký dátum)
//    - Zlúči backlinky do najstaršieho záznamu
//    - Zmaže duplikáty
//    - Použitie: Manuálna akcia pre cleanup duplicitných záznamov
// ==============================================
// 🔧 CHANGELOG:
// v1.0.0 (2026-03-20) - INITIAL VERSION:
//    - Manual cleanup action for duplicate Daily Reports
//    - Finds all duplicates by date
//    - Merges all backlinks into oldest report
//    - Deletes duplicate reports
//    - Shows summary and confirmation before merge
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;

var CONFIG = {
    scriptName: "Denný report - Merge Duplicates",
    version: "1.0.0",

    // Referencie na centrálny config
    fields: {
        dailyReport: centralConfig.fields.dailyReport,
        common: centralConfig.fields.common
    },
    libraries: centralConfig.libraries,
    icons: centralConfig.icons
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(entry(), utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // Získaj všetky záznamy denného reportu
        var allReports = lib().entries();
        utils.addDebug(entry(), "📊 Celkom záznamov v Denný report: " + allReports.length);

        // Zoskup záznamy podľa dátumu
        var dateMap = {}; // date -> [reports]

        for (var i = 0; i < allReports.length; i++) {
            var report = allReports[i];
            var date = utils.safeGet(report, CONFIG.fields.dailyReport.date);

            if (!date) {
                utils.addDebug(entry(), "  ⚠️ Záznam #" + report.field("ID") + " nemá dátum, preskakujem");
                continue;
            }

            var dateKey = moment(date).format('YYYY-MM-DD');
            if (!dateMap[dateKey]) {
                dateMap[dateKey] = [];
            }
            dateMap[dateKey].push(report);
        }

        // Nájdi duplicity
        var duplicatesFound = [];
        for (var dateKey in dateMap) {
            if (dateMap[dateKey].length > 1) {
                duplicatesFound.push({
                    date: dateKey,
                    count: dateMap[dateKey].length,
                    reports: dateMap[dateKey]
                });
            }
        }

        if (duplicatesFound.length === 0) {
            dialog("Kontrola duplikátov", "✅ Nenašli sa žiadne duplicitné záznamy.", "OK");
            utils.addDebug(entry(), "✅ Žiadne duplikáty nenájdené");
            return;
        }

        // Zobraž zhrnutie
        var summary = "🔍 NÁJDENÉ DUPLIKÁTY:\n\n";
        for (var i = 0; i < duplicatesFound.length; i++) {
            summary += "📅 " + duplicatesFound[i].date + " → " +
                       duplicatesFound[i].count + " záznamov\n";
        }
        summary += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        summary += "⚠️ UPOZORNENIE:\n";
        summary += "Zlúčenie presunie všetky backlinky do najstaršieho záznamu\n";
        summary += "a zmaže duplicitné záznamy.\n\n";
        summary += "Celkom duplicitných skupín: " + duplicatesFound.length + "\n\n";
        summary += "Pokračovať a zlúčiť duplikáty?";

        var confirm = dialog("Duplikáty v Dennom reporte", summary, "Áno", "Nie");
        if (confirm !== 0) {
            utils.addDebug(entry(), "❌ Používateľ zrušil zlúčenie");
            message("❌ Zlúčenie zrušené");
            return;
        }

        // Zlúč každú skupinu duplicitov
        var mergedCount = 0;
        var deletedCount = 0;

        for (var i = 0; i < duplicatesFound.length; i++) {
            var group = duplicatesFound[i].reports;
            utils.addDebug(entry(), "🔄 Spracovávam skupinu: " + duplicatesFound[i].date + " (" + group.length + " záznamov)");

            // Zoraď podľa času vytvorenia (najstarší prvý)
            // CRITICAL: Použiť 'dátum zápisu' field ak existuje
            group.sort(function(a, b) {
                var aTime = utils.safeGet(a, CONFIG.fields.common.createdTime) || new Date(0);
                var bTime = utils.safeGet(b, CONFIG.fields.common.createdTime) || new Date(0);

                // Convert to timestamps for comparison
                if (typeof aTime.getTime === 'function') {
                    aTime = aTime.getTime();
                }
                if (typeof bTime.getTime === 'function') {
                    bTime = bTime.getTime();
                }

                return aTime - bTime;
            });

            var primaryReport = group[0]; // Najstarší záznam - tento zostane
            utils.addDebug(entry(), "  📌 Hlavný záznam (najstarší): #" + primaryReport.field("ID"));

            // Zlúč backlinky z duplicitov
            var backlinkFields = [
                CONFIG.fields.dailyReport.attendance,
                CONFIG.fields.dailyReport.workRecord,
                CONFIG.fields.dailyReport.rideLog,
                CONFIG.fields.dailyReport.cashBook
            ];

            for (var j = 1; j < group.length; j++) {
                var duplicate = group[j];
                var dupId = duplicate.field("ID");
                utils.addDebug(entry(), "  🔄 Spracovávam duplicitný záznam #" + dupId);

                // Prekopíruj všetky backlinky
                for (var k = 0; k < backlinkFields.length; k++) {
                    var field = backlinkFields[k];
                    var dupLinks = utils.safeGetLinks(duplicate, field, []);
                    var primaryLinks = utils.safeGetLinks(primaryReport, field, []);

                    // Pridaj chýbajúce linky
                    var addedCount = 0;
                    for (var l = 0; l < dupLinks.length; l++) {
                        var link = dupLinks[l];
                        var exists = false;

                        for (var m = 0; m < primaryLinks.length; m++) {
                            if (primaryLinks[m].id === link.id) {
                                exists = true;
                                break;
                            }
                        }

                        if (!exists) {
                            primaryLinks.push(link);
                            addedCount++;
                        }
                    }

                    // Ulož aktualizované linky
                    if (addedCount > 0) {
                        utils.safeSet(primaryReport, field, primaryLinks);
                        utils.addDebug(entry(), "    ✅ Pridaných " + addedCount + " linkov do poľa " + field);
                    }
                }

                // Zmaž duplicitný záznam
                lib().deleteEntry(duplicate);
                deletedCount++;
                utils.addDebug(entry(), "    🗑️ Zmazaný duplicitný záznam #" + dupId);
            }

            mergedCount++;
        }

        // Finálne zhrnutie
        var finalSummary = "✅ ZLÚČENIE DOKONČENÉ\n\n";
        finalSummary += "Zlúčených skupín: " + mergedCount + "\n";
        finalSummary += "Zmazaných duplicitov: " + deletedCount + "\n\n";
        finalSummary += "Zostalo jedinečných záznamov: " + (allReports.length - deletedCount);

        dialog("Výsledok zlúčenia", finalSummary, "OK");
        utils.addDebug(entry(), "✅ Zlúčenie dokončené: " + mergedCount + " skupín, " + deletedCount + " duplicitov zmazaných");

        message("✅ Zlúčené " + mergedCount + " skupín\n🗑️ Zmazaných " + deletedCount + " duplicitov");

    } catch (error) {
        utils.addError(entry(), "Kritická chyba v hlavnej funkcii", "main", error);
        dialog("Chyba", "❌ Kritická chyba!\n\n" + error.toString(), "OK");
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
