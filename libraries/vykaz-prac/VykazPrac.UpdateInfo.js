// ==============================================
// MEMENTO DATABASE - VÝKAZ PRÁC UPDATE INFO
// Verzia: 1.0.0 | Dátum: október 2025 | Autor: ASISTANTO
// Knižnica: Výkaz prác | Trigger: Manual (Button)
// ==============================================
// Účel: Regeneruje info pole s prehľadnou štruktúrou
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Výkaz prác Update Info",
    version: "1.0.0",

    // Referencie na centrálny config
    fields: {
        workReport: centralConfig.fields.workReport,
        workRecord: centralConfig.fields.workRecord,
        workPrices: centralConfig.fields.workPrices
    },
    attributes: {
        workReport: centralConfig.attributes.workReport,
        workReportWorkItems: centralConfig.attributes.workReportWorkItems
    },
    icons: centralConfig.icons
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.addDebug(currentEntry, utils.getIcon("start") + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");
        utils.clearLogs(currentEntry, true);

        // Vygeneruj nové info
        var newInfo = generateWorkReportInfo();

        // Ulož do poľa info
        utils.safeSet(currentEntry, CONFIG.fields.workReport.info, newInfo);

        utils.addDebug(currentEntry, utils.getIcon("success") + " Info pole bolo úspešne aktualizované");
        message("✅ Info pole bolo aktualizované");

        return true;

    } catch (error) {
        utils.addError(currentEntry, error.toString(), "main", error);
        message("❌ Chyba: " + error.toString());
        return false;
    }
}

// ==============================================
// GENEROVANIE INFO ZÁZNAMU
// ==============================================

function generateWorkReportInfo() {
    try {
        // Získaj všetky záznamy prác z výkazu
        var workRecords = utils.safeGetLinks(currentEntry, CONFIG.fields.workReport.workRecords) || [];
        var workItems = utils.safeGetLinks(currentEntry, CONFIG.fields.workReport.workItems) || [];

        var info = "# 📋 VÝKAZ PRÁC\n\n";

        var totalHours = 0;
        var totalHzsSum = 0;
        var totalItemsSum = 0;

        // Sekcia Hodinovka (HZS)
        if (workRecords.length > 0) {
            info += "## ⏱️ HODINOVKA\n\n";

            // Tabuľka - hlavička
            info += "| # | Dátum | Hodiny | Sadzba | Cena |\n";
            info += "|---|--------|--------|--------|--------|\n";

            // Získaj atribúty cez field()
            var workRecordsWithAttrs = currentEntry.field(CONFIG.fields.workReport.workRecords);

            for (var i = 0; i < workRecords.length; i++) {
                var record = workRecords[i];
                var recordWithAttrs = workRecordsWithAttrs[i];

                var recordDate = utils.safeGet(record, CONFIG.fields.workRecord.date);
                var dateFormatted = utils.formatDate(recordDate, "DD.MM.YYYY");

                var hours = parseFloat(recordWithAttrs.attr(CONFIG.attributes.workReport.hoursCount)) || 0;
                var rate = parseFloat(recordWithAttrs.attr(CONFIG.attributes.workReport.billedRate)) || 0;
                var price = parseFloat(recordWithAttrs.attr(CONFIG.attributes.workReport.totalPrice)) || 0;

                totalHours += hours;
                totalHzsSum += price;

                // Riadok tabuľky
                info += "| " + (i + 1) + " | ";
                info += dateFormatted + " | ";
                info += hours.toFixed(2) + " h | ";
                info += rate.toFixed(2) + " €/h | ";
                info += "**" + price.toFixed(2) + " €** |\n";
            }

            info += "\n**📊 Súhrn Hodinovka:**\n";
            info += "- Celkové hodiny: **" + totalHours.toFixed(2) + " h**\n";
            info += "- Celková suma: **" + totalHzsSum.toFixed(2) + " €**\n\n";
        }

        // Sekcia Položky
        if (workItems.length > 0) {
            info += "## 📋 POLOŽKY\n\n";

            // Tabuľka - hlavička
            info += "| # | Názov | Množstvo | MJ | Cena | Cena celkom |\n";
            info += "|---|-------|----------|----|----- |-------------|\n";

            // Získaj atribúty cez field()
            var workItemsWithAttrs = currentEntry.field(CONFIG.fields.workReport.workItems);

            for (var i = 0; i < workItems.length; i++) {
                var item = workItems[i];
                var itemWithAttrs = workItemsWithAttrs[i];

                // Získaj názov položky z linknutého záznamu (pole "Názov")
                var itemName = utils.safeGet(item, "Názov", "Neznáma položka");

                // Získaj mernú jednotku z linknutého záznamu cenníka (pole "MJ")
                var mjLinks = utils.safeGetLinks(item, "MJ") || [];
                var mj = "ks";
                if (mjLinks.length > 0) {
                    mj = utils.safeGet(mjLinks[0], "Názov", "ks");
                }

                var quantity = parseFloat(itemWithAttrs.attr(CONFIG.attributes.workReportWorkItems.quantity)) || 0;
                var price = parseFloat(itemWithAttrs.attr(CONFIG.attributes.workReportWorkItems.price)) || 0;
                var total = parseFloat(itemWithAttrs.attr(CONFIG.attributes.workReportWorkItems.totalPrice)) || 0;

                totalItemsSum += total;

                // Riadok tabuľky
                info += "| " + (i + 1) + " | ";
                info += itemName + " | ";
                info += quantity.toFixed(2) + " | ";
                info += mj + " | ";
                info += price.toFixed(2) + " € | ";
                info += "**" + total.toFixed(2) + " €** |\n";
            }

            info += "\n**📊 Súhrn Položky:**\n";
            info += "- Celková suma: **" + totalItemsSum.toFixed(2) + " €**\n\n";
        }

        // Celkový súhrn - porovnanie
        if (workRecords.length > 0 && workItems.length > 0) {
            info += "## 💰 POROVNANIE ÚČTOVANIA\n\n";

            var difference = totalItemsSum - totalHzsSum;
            var percentDiff = totalHzsSum > 0 ? (difference / totalHzsSum * 100) : 0;

            info += "| Typ účtovania | Suma | Poznámka |\n";
            info += "|---------------|------|----------|\n";
            info += "| ⏱️ Hodinovka | " + totalHzsSum.toFixed(2) + " € | |\n";
            info += "| 📋 Položky | " + totalItemsSum.toFixed(2) + " € | |\n";
            info += "| **Rozdiel** | **" + Math.abs(difference).toFixed(2) + " €** | ";

            if (difference > 0) {
                info += "✅ Položky výhodnejšie o " + percentDiff.toFixed(1) + "% |\n";
            } else if (difference < 0) {
                info += "⚠️ Hodinovka výhodnejšia o " + Math.abs(percentDiff).toFixed(1) + "% |\n";
            } else {
                info += "⚖️ Rovnaké |\n";
            }

            info += "\n";

        } else if (workRecords.length > 0 || workItems.length > 0) {
            // Iba jeden typ účtovania
            var grandTotal = totalHzsSum + totalItemsSum;
            info += "## 💰 CELKOVÁ SUMA\n";
            info += "**" + grandTotal.toFixed(2) + " €**\n\n";
        }

        // Ak nie sú žiadne dáta
        if (workRecords.length === 0 && workItems.length === 0) {
            info += "_Tento výkaz zatiaľ neobsahuje žiadne záznamy prác ani položky._\n\n";
        }

        // Metainfo
        info += "---\n";
        info += "*Vygenerované: " + moment().format("DD.MM.YYYY HH:mm") + "*\n";
        info += "*Script: " + CONFIG.scriptName + " v" + CONFIG.version + "*";

        return info;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri generovaní info: " + error.toString(), "generateWorkReportInfo", error);
        return "Chyba pri generovaní info záznamu: " + error.toString();
    }
}

// ==============================================
// SPUSTENIE
// ==============================================

main();
