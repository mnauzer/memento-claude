// ==============================================
// MEMENTO DATABASE - MATERIÁL NASTAVENIE POLÍ BULK ACTION
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Bulk Action
// ==============================================
// 📋 FUNKCIA:
//    - Hromadné nastavenie polí pre prepočet cien označených materiálov
//    - Nastavuje polia pre prepočet na vybraných záznamoch
//    - Umožňuje jednotne nakonfigurovať označené materiály
//    - Dialog so zhrnutím len na konci operácie
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
// 📝 ARGUMENTY:
//    - "Prepočet ceny" (Options: "Pevná cena", "Podľa prirážky", "Neprepočítavať"): Spôsob prepočtu ceny
//    - "Obchodná prirážka" (Number): Percentuálna prirážka k nákupnej cene
//    - "Zaokrúhľovanie cien" (Options: "Nahor", "Nadol", "Nezaokrúhľovať", "Najbližšie"): Typ zaokrúhľovania
//    - "Hodnota zaokrúhenia" (Options: "Desatiny", "Jednotky", "Desiatky", "Stovky"): Presnosť zaokrúhľovania
//    - "Zmena nákupnej ceny" (Options: "Upozorniť", "Prepočítať", "Upozorniť a prepočítať", "Ignorovať"): Akcia pri zmene ceny
//    - "Percento zmeny" (Number): Prah percentuálnej zmeny pre trigger
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;

var CONFIG = {
    scriptName: "Materiál Nastavenie polí Bulk Action",
    version: "1.0.0",

    // Knižnice
    libraries: {
        inventory: (centralConfig.libraries && centralConfig.libraries.inventory) || "Materiál"
    },

    // Polia Materiál
    materialFields: {
        name: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.name) || "Názov",
        category: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.category) || "Kategória",
        priceCalculation: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceCalculation) || "Prepočet ceny",
        markupPercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.markupPercentage) || "Obchodná prirážka",
        priceRounding: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceRounding) || "Zaokrúhľovanie cien",
        roundingValue: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.roundingValue) || "Hodnota zaokrúhľovania",
        purchasePriceChange: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePriceChange) || "Zmena nákupnej ceny",
        changePercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.changePercentage) || "Percento zmeny",
        icons: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.icons) || "icons"
    },

    // Spoločné polia
    commonFields: {
        debugLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.debugLog) || "Debug_Log",
        errorLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.errorLog) || "Error_Log",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },

    // Ikony
    icons: {
        success: "✅",
        warning: "⚠️",
        error: "❌",
        info: "ℹ️",
        settings: "⚙️",
        processing: "🔧"
    }
};

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function getSafeArgument(argName, defaultValue) {
    try {
        var value = argument(argName);
        return value !== null && value !== undefined ? value : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

// ==============================================
// NAČÍTANIE ARGUMENTOV
// ==============================================

var priceCalculation = getSafeArgument("Prepočet ceny", "");
var markupPercentage = getSafeArgument("Obchodná prirážka", null);
var priceRounding = getSafeArgument("Zaokrúhľovanie cien", "");
var roundingValue = getSafeArgument("Hodnota zaokrúhenia", "");
var purchasePriceChange = getSafeArgument("Zmena nákupnej ceny", "");
var changePercentage = getSafeArgument("Percento zmeny", null);

// ==============================================
// ZÍSKANIE OZNAČENÝCH ZÁZNAMOV
// ==============================================

var selectedMaterials;
try {
    selectedMaterials = selectedEntries();
} catch (error) {
    dialog(CONFIG.icons.error + " CHYBA: Nepodarilo sa získať označené záznamy: " + error.toString());
    selectedMaterials = [];
}

if (!selectedMaterials || selectedMaterials.length === 0) {
    dialog(CONFIG.icons.warning + " UPOZORNENIE: Žiadne záznamy nie sú označené!\n\nPre použitie bulk action označte materiály, ktoré chcete upraviť.");
    selectedMaterials = [];
}

// ==============================================
// INICIALIZÁCIA ŠTATISTÍK
// ==============================================

var stats = {
    total: selectedMaterials.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    processedMaterials: []
};

// ==============================================
// HLAVNÁ LOGIKA - SPRACOVANIE MATERIÁLOV
// ==============================================

if (selectedMaterials.length > 0) {
    // Spracovanie každého označeného materiálu
    for (var i = 0; i < selectedMaterials.length; i++) {
        var material = selectedMaterials[i];
        var materialName = utils.safeGet(material, CONFIG.materialFields.name, "Neznámy materiál");
        var hasChanges = false;
        var materialChanges = [];

        try {
            // Nastavenie Prepočet ceny
            if (priceCalculation && priceCalculation.trim() !== "") {
                var currentPriceCalculation = utils.safeGet(material, CONFIG.materialFields.priceCalculation, "");
                if (currentPriceCalculation !== priceCalculation) {
                    utils.safeSet(material, CONFIG.materialFields.priceCalculation, priceCalculation);
                    materialChanges.push("Prepočet ceny: '" + currentPriceCalculation + "' → '" + priceCalculation + "'");
                    hasChanges = true;
                }
            }

            // Nastavenie Obchodná prirážka
            if (markupPercentage !== null && !isNaN(markupPercentage)) {
                var currentMarkup = parseFloat(utils.safeGet(material, CONFIG.materialFields.markupPercentage, 0));
                if (Math.abs(currentMarkup - markupPercentage) > 0.01) {
                    utils.safeSet(material, CONFIG.materialFields.markupPercentage, markupPercentage);
                    materialChanges.push("Obchodná prirážka: " + currentMarkup + "% → " + markupPercentage + "%");
                    hasChanges = true;
                }
            }

            // Nastavenie Zaokrúhľovanie cien
            if (priceRounding && priceRounding.trim() !== "") {
                var currentRounding = utils.safeGet(material, CONFIG.materialFields.priceRounding, "");
                if (currentRounding !== priceRounding) {
                    utils.safeSet(material, CONFIG.materialFields.priceRounding, priceRounding);
                    materialChanges.push("Zaokrúhľovanie: '" + currentRounding + "' → '" + priceRounding + "'");
                    hasChanges = true;
                }
            }

            // Nastavenie Hodnota zaokrúhľovania
            if (roundingValue && roundingValue.trim() !== "") {
                var currentRoundingValue = utils.safeGet(material, CONFIG.materialFields.roundingValue, "");
                if (currentRoundingValue !== roundingValue) {
                    utils.safeSet(material, CONFIG.materialFields.roundingValue, roundingValue);
                    materialChanges.push("Hodnota zaokrúhľovania: '" + currentRoundingValue + "' → '" + roundingValue + "'");
                    hasChanges = true;
                }
            }

            // Nastavenie Zmena nákupnej ceny
            if (purchasePriceChange && purchasePriceChange.trim() !== "") {
                var currentPriceChange = utils.safeGet(material, CONFIG.materialFields.purchasePriceChange, "");
                if (currentPriceChange !== purchasePriceChange) {
                    utils.safeSet(material, CONFIG.materialFields.purchasePriceChange, purchasePriceChange);
                    materialChanges.push("Zmena nákupnej ceny: '" + currentPriceChange + "' → '" + purchasePriceChange + "'");
                    hasChanges = true;
                }
            }

            // Nastavenie Percento zmeny
            if (changePercentage !== null && !isNaN(changePercentage)) {
                var currentChangePercentage = parseFloat(utils.safeGet(material, CONFIG.materialFields.changePercentage, 0));
                if (Math.abs(currentChangePercentage - changePercentage) > 0.01) {
                    utils.safeSet(material, CONFIG.materialFields.changePercentage, changePercentage);
                    materialChanges.push("Percento zmeny: " + currentChangePercentage + "% → " + changePercentage + "%");
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                // Pridanie ikony indikujúcej nastavenie
                var currentIcons = utils.safeGet(material, CONFIG.materialFields.icons, "");
                var newIcon = CONFIG.icons.settings;
                if (!currentIcons.includes(newIcon)) {
                    var updatedIcons = currentIcons ? currentIcons + " " + newIcon : newIcon;
                    utils.safeSet(material, CONFIG.materialFields.icons, updatedIcons);
                }

                stats.updated++;
                stats.processedMaterials.push({
                    name: materialName,
                    changes: materialChanges,
                    status: "updated"
                });
            } else {
                stats.skipped++;
                stats.processedMaterials.push({
                    name: materialName,
                    changes: [],
                    status: "skipped"
                });
            }

        } catch (error) {
            stats.errors++;
            stats.processedMaterials.push({
                name: materialName,
                changes: [],
                status: "error",
                error: error.toString()
            });
        }
    }

    // ==============================================
    // VYTVORENIE INFO ZÁZNAMU V PRVOM MATERIÁLI
    // ==============================================

    if (stats.total > 0) {
        var firstMaterial = selectedMaterials[0];
        var infoMessage = CONFIG.icons.settings + " HROMADNÉ NASTAVENIE POLÍ MATERIÁLOV (BULK)\n";
        infoMessage += "════════════════════════════════════════════════\n";
        infoMessage += "📅 Dátum: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";
        infoMessage += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n";

        infoMessage += "📊 SÚHRN SPRACOVANIA:\n";
        infoMessage += "───────────────────────────────────────────────\n";
        infoMessage += "• Označené materiály: " + stats.total + "\n";
        infoMessage += "• Aktualizované: " + stats.updated + "\n";
        infoMessage += "• Preskočené (bez zmien): " + stats.skipped + "\n";
        infoMessage += "• Chyby: " + stats.errors + "\n\n";

        infoMessage += CONFIG.icons.settings + " NASTAVENÉ HODNOTY:\n";
        infoMessage += "───────────────────────────────────────────────\n";
        if (priceCalculation && priceCalculation.trim() !== "") {
            infoMessage += "• Prepočet ceny: " + priceCalculation + "\n";
        }
        if (markupPercentage !== null && !isNaN(markupPercentage)) {
            infoMessage += "• Obchodná prirážka: " + markupPercentage + "%\n";
        }
        if (priceRounding && priceRounding.trim() !== "") {
            infoMessage += "• Zaokrúhľovanie cien: " + priceRounding + "\n";
        }
        if (roundingValue && roundingValue.trim() !== "") {
            infoMessage += "• Hodnota zaokrúhľovania: " + roundingValue + "\n";
        }
        if (purchasePriceChange && purchasePriceChange.trim() !== "") {
            infoMessage += "• Zmena nákupnej ceny: " + purchasePriceChange + "\n";
        }
        if (changePercentage !== null && !isNaN(changePercentage)) {
            infoMessage += "• Percento zmeny: " + changePercentage + "%\n";
        }

        // Detaily aktualizovaných materiálov (max 10)
        if (stats.updated > 0) {
            infoMessage += "\n" + CONFIG.icons.success + " AKTUALIZOVANÉ MATERIÁLY:\n";
            infoMessage += "───────────────────────────────────────────────\n";
            var updatedCount = 0;
            for (var i = 0; i < stats.processedMaterials.length && updatedCount < 10; i++) {
                var mat = stats.processedMaterials[i];
                if (mat.status === "updated") {
                    infoMessage += "• " + mat.name + "\n";
                    for (var j = 0; j < mat.changes.length; j++) {
                        infoMessage += "  - " + mat.changes[j] + "\n";
                    }
                    updatedCount++;
                }
            }
            if (stats.updated > 10) {
                infoMessage += "• ... a " + (stats.updated - 10) + " ďalších materiálov\n";
            }
        }

        // Chyby (max 5)
        if (stats.errors > 0) {
            infoMessage += "\n" + CONFIG.icons.error + " CHYBY:\n";
            infoMessage += "───────────────────────────────────────────────\n";
            var errorCount = 0;
            for (var i = 0; i < stats.processedMaterials.length && errorCount < 5; i++) {
                var mat = stats.processedMaterials[i];
                if (mat.status === "error") {
                    infoMessage += "• " + mat.name + ": " + mat.error + "\n";
                    errorCount++;
                }
            }
            if (stats.errors > 5) {
                infoMessage += "• ... a " + (stats.errors - 5) + " ďalších chýb\n";
            }
        }

        infoMessage += "\n" + CONFIG.icons.success + " NASTAVENIE DOKONČENÉ";

        // Nastavenie info záznamu do prvého materiálu
        utils.safeSet(firstMaterial, CONFIG.commonFields.info, infoMessage);
    }
}

// ==============================================
// FINÁLNY DIALOG
// ==============================================

var isSuccess = stats.errors === 0;
var summaryMessage = "";

if (isSuccess) {
    summaryMessage = CONFIG.icons.success + " ÚSPEŠNE DOKONČENÉ\n\n";
} else {
    summaryMessage = CONFIG.icons.warning + " DOKONČENÉ S CHYBAMI\n\n";
}

summaryMessage += "📦 Označené materiály: " + stats.total + "\n";
summaryMessage += CONFIG.icons.success + " Aktualizované: " + stats.updated + "\n";
summaryMessage += "➖ Preskočené: " + stats.skipped + "\n";

if (stats.errors > 0) {
    summaryMessage += CONFIG.icons.error + " Chyby: " + stats.errors + "\n";
}

if (stats.total > 0) {
    summaryMessage += "\n" + CONFIG.icons.info + " Detaily v prvom materiáli v poli 'info'";
}

dialog(summaryMessage);