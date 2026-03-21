// ==============================================
// MEMENTO DATABASE - MATERIÁL NASTAVENIE POLÍ ACTION
// Verzia: 1.0.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Hromadné nastavenie polí pre prepočet cien materiálov
//    - Filtruje záznamy podľa kategórie a nastavuje polia pre prepočet
//    - Umožňuje jednotne nakonfigurovať materiály v kategórii
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
// 📝 ARGUMENTY:
//    - "Kategória" (String): Kategória materiálov na filtrovanie
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
var currentEntry = entry();

var CONFIG = {
    scriptName: "Materiál Nastavenie polí Action",
    version: "1.0.0",

    // Knižnice
    libraries: {
        inventory: config.libraries.inventory || "Materiál"
    },

    // Polia Materiál
    materialFields: {
        name: config.fields.items.name || "Názov",
        category: config.fields.items.category || "Kategória",
        priceCalculation: config.fields.items.priceCalculation || "Prepočet ceny",
        markupPercentage: config.fields.items.markupPercentage || "Obchodná prirážka",
        priceRounding: config.fields.items.priceRounding || "Zaokrúhľovanie cien",
        roundingValue: config.fields.items.roundingValue || "Hodnota zaokrúhienia",
        purchasePriceChange: config.fields.items.purchasePriceChange || "Zmena nákupnej ceny",
        changePercentage: config.fields.items.changePercentage || "Percento zmeny",
        icons: config.fields.items.icons || "icons"
    },

    // Spoločné polia
    commonFields: {
        debugLog: config.fields.common.debugLog || "Debug_Log",
        errorLog: config.fields.common.errorLog || "Error_Log",
        info: config.fields.common.info || "info"
    }
};

// ==============================================
// NAČÍTANIE ARGUMENTOV
// ==============================================

function getSafeArgument(argName, defaultValue) {
    try {
        var value = argument(argName);
        return value !== null && value !== undefined ? value : defaultValue;
    } catch (error) {
        utils.addDebug(currentEntry, "⚠️ Argument '" + argName + "' nie je dostupný, použije sa default: " + defaultValue);
        return defaultValue;
    }
}

var targetCategory = getSafeArgument("Kategória", "");
var priceCalculation = getSafeArgument("Prepočet ceny", "");
var markupPercentage = getSafeArgument("Obchodná prirážka", null);
var priceRounding = getSafeArgument("Zaokrúhľovanie cien", "");
var roundingValue = getSafeArgument("Hodnota zaokrúhenia", "");
var purchasePriceChange = getSafeArgument("Zmena nákupnej ceny", "");
var changePercentage = getSafeArgument("Percento zmeny", null);

// ==============================================
// VALIDÁCIA ARGUMENTOV
// ==============================================

utils.addDebug(currentEntry, "🚀 " + CONFIG.scriptName + " v" + CONFIG.version);
utils.addDebug(currentEntry, "📦 Spúšťam nastavenie polí pre materiály...");

// Kontrola povinnných argumentov
if (!targetCategory || targetCategory.trim() === "") {
    utils.addError(currentEntry, "❌ Argument 'Kategória' nie je zadaný", CONFIG.scriptName);
    message("❌ CHYBA: Argument 'Kategória' musí byť zadaný!");
    return;
}

utils.addDebug(currentEntry, "🔍 Parametre:");
utils.addDebug(currentEntry, "  • Kategória: '" + targetCategory + "'");
utils.addDebug(currentEntry, "  • Prepočet ceny: '" + priceCalculation + "'");
utils.addDebug(currentEntry, "  • Obchodná prirážka: " + (markupPercentage !== null ? markupPercentage + "%" : "nezadané"));
utils.addDebug(currentEntry, "  • Zaokrúhľovanie: '" + priceRounding + "'");
utils.addDebug(currentEntry, "  • Hodnota zaokrúhľovania: '" + roundingValue + "'");
utils.addDebug(currentEntry, "  • Zmena nákupnej ceny: '" + purchasePriceChange + "'");
utils.addDebug(currentEntry, "  • Percento zmeny: " + (changePercentage !== null ? changePercentage + "%" : "nezadané"));

// ==============================================
// HĽADANIE MATERIÁLOV PODĽA KATEGÓRIE
// ==============================================

var inventoryLib = libByName(CONFIG.libraries.inventory);
if (!inventoryLib) {
    utils.addError(currentEntry, "❌ Knižnica " + CONFIG.libraries.inventory + " neexistuje", CONFIG.scriptName);
    message("❌ CHYBA: Knižnica materiálov neexistuje!");
    return;
}

utils.addDebug(currentEntry, "🔍 Hľadám materiály v kategórii: " + targetCategory);

var allMaterials = inventoryLib.entries();
var filteredMaterials = [];

for (var i = 0; i < allMaterials.length; i++) {
    var material = allMaterials[i];
    var materialCategory = utils.safeGet(material, CONFIG.materialFields.category, "");

    if (materialCategory === targetCategory) {
        filteredMaterials.push(material);
    }
}

utils.addDebug(currentEntry, "📊 Nájdených materiálov v kategórii '" + targetCategory + "': " + filteredMaterials.length);

if (filteredMaterials.length === 0) {
    utils.addError(currentEntry, "⚠️ Žiadne materiály v kategórii '" + targetCategory + "' neboli nájdené", CONFIG.scriptName);
    message("⚠️ UPOZORNENIE: Žiadne materiály v kategórii '" + targetCategory + "' neboli nájdené!");
    return;
}

// ==============================================
// NASTAVENIE POLÍ PRE KAŽDÝ MATERIÁL
// ==============================================

var updatedCount = 0;
var errorsCount = 0;
var skippedCount = 0;

utils.addDebug(currentEntry, "🔧 Spúšťam nastavenie polí pre " + filteredMaterials.length + " materiálov...");

for (var i = 0; i < filteredMaterials.length; i++) {
    var material = filteredMaterials[i];
    var materialName = utils.safeGet(material, CONFIG.materialFields.name, "Neznámy materiál");
    var hasChanges = false;

    try {
        utils.addDebug(currentEntry, "📦 [" + (i + 1) + "/" + filteredMaterials.length + "] " + materialName);

        // Nastavenie Prepočet ceny
        if (priceCalculation && priceCalculation.trim() !== "") {
            var currentPriceCalculation = utils.safeGet(material, CONFIG.materialFields.priceCalculation, "");
            if (currentPriceCalculation !== priceCalculation) {
                utils.safeSet(material, CONFIG.materialFields.priceCalculation, priceCalculation);
                utils.addDebug(currentEntry, "  ✅ Prepočet ceny: '" + currentPriceCalculation + "' → '" + priceCalculation + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Obchodná prirážka
        if (markupPercentage !== null && !isNaN(markupPercentage)) {
            var currentMarkup = parseFloat(utils.safeGet(material, CONFIG.materialFields.markupPercentage, 0));
            if (Math.abs(currentMarkup - markupPercentage) > 0.01) {
                utils.safeSet(material, CONFIG.materialFields.markupPercentage, markupPercentage);
                utils.addDebug(currentEntry, "  ✅ Obchodná prirážka: " + currentMarkup + "% → " + markupPercentage + "%");
                hasChanges = true;
            }
        }

        // Nastavenie Zaokrúhľovanie cien
        if (priceRounding && priceRounding.trim() !== "") {
            var currentRounding = utils.safeGet(material, CONFIG.materialFields.priceRounding, "");
            if (currentRounding !== priceRounding) {
                utils.safeSet(material, CONFIG.materialFields.priceRounding, priceRounding);
                utils.addDebug(currentEntry, "  ✅ Zaokrúhľovanie: '" + currentRounding + "' → '" + priceRounding + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Hodnota zaokrúhľovania
        if (roundingValue && roundingValue.trim() !== "") {
            var currentRoundingValue = utils.safeGet(material, CONFIG.materialFields.roundingValue, "");
            if (currentRoundingValue !== roundingValue) {
                utils.safeSet(material, CONFIG.materialFields.roundingValue, roundingValue);
                utils.addDebug(currentEntry, "  ✅ Hodnota zaokrúhľovania: '" + currentRoundingValue + "' → '" + roundingValue + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Zmena nákupnej ceny
        if (purchasePriceChange && purchasePriceChange.trim() !== "") {
            var currentPriceChange = utils.safeGet(material, CONFIG.materialFields.purchasePriceChange, "");
            if (currentPriceChange !== purchasePriceChange) {
                utils.safeSet(material, CONFIG.materialFields.purchasePriceChange, purchasePriceChange);
                utils.addDebug(currentEntry, "  ✅ Zmena nákupnej ceny: '" + currentPriceChange + "' → '" + purchasePriceChange + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Percento zmeny
        if (changePercentage !== null && !isNaN(changePercentage)) {
            var currentChangePercentage = parseFloat(utils.safeGet(material, CONFIG.materialFields.changePercentage, 0));
            if (Math.abs(currentChangePercentage - changePercentage) > 0.01) {
                utils.safeSet(material, CONFIG.materialFields.changePercentage, changePercentage);
                utils.addDebug(currentEntry, "  ✅ Percento zmeny: " + currentChangePercentage + "% → " + changePercentage + "%");
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // Pridanie ikony indikujúcej nastavenie
            var currentIcons = utils.safeGet(material, CONFIG.materialFields.icons, "");
            var newIcon = "⚙️";
            if (!currentIcons.includes(newIcon)) {
                var updatedIcons = currentIcons ? currentIcons + " " + newIcon : newIcon;
                utils.safeSet(material, CONFIG.materialFields.icons, updatedIcons);
                utils.addDebug(currentEntry, "  🎯 Pridaná ikona: " + newIcon);
            }

            updatedCount++;
            utils.addDebug(currentEntry, "  ✅ Materiál aktualizovaný");
        } else {
            skippedCount++;
            utils.addDebug(currentEntry, "  ➖ Žiadne zmeny");
        }

    } catch (error) {
        errorsCount++;
        utils.addError(currentEntry, "Chyba pri spracovaní materiálu '" + materialName + "': " + error.toString(), CONFIG.scriptName, error);
        utils.addDebug(currentEntry, "  ❌ Chyba pri spracovaní");
    }
}

// ==============================================
// VYTVORENIE INFO ZÁZNAMU
// ==============================================

var infoMessage = "⚙️ HROMADNÉ NASTAVENIE POLÍ MATERIÁLOV\n";
infoMessage += "══════════════════════════════════════════\n";
infoMessage += "📅 Dátum: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";
infoMessage += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n";

infoMessage += "🔍 FILTER:\n";
infoMessage += "───────────────────────────────────────────\n";
infoMessage += "• Kategória: " + targetCategory + "\n";
infoMessage += "• Nájdených materiálov: " + filteredMaterials.length + "\n\n";

infoMessage += "⚙️ NASTAVENÉ HODNOTY:\n";
infoMessage += "───────────────────────────────────────────\n";
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

infoMessage += "\n📊 VÝSLEDKY:\n";
infoMessage += "───────────────────────────────────────────\n";
infoMessage += "• Aktualizované: " + updatedCount + " materiálov\n";
infoMessage += "• Preskočené (bez zmien): " + skippedCount + " materiálov\n";
infoMessage += "• Chyby: " + errorsCount + " materiálov\n";
infoMessage += "• Celkovo spracované: " + filteredMaterials.length + " materiálov\n\n";

infoMessage += "✅ NASTAVENIE DOKONČENÉ";

utils.safeSet(currentEntry, CONFIG.commonFields.info, infoMessage);

// ==============================================
// FINÁLNY SÚHRN
// ==============================================

var isSuccess = errorsCount === 0;
var summaryMessage = "";

if (isSuccess) {
    summaryMessage = "✅ ÚSPEŠNE DOKONČENÉ\n\n";
} else {
    summaryMessage = "⚠️ DOKONČENÉ S CHYBAMI\n\n";
}

summaryMessage += "📦 Kategória: " + targetCategory + "\n";
summaryMessage += "📊 Spracované: " + filteredMaterials.length + " materiálov\n";
summaryMessage += "✅ Aktualizované: " + updatedCount + "\n";
summaryMessage += "➖ Preskočené: " + skippedCount + "\n";

if (errorsCount > 0) {
    summaryMessage += "❌ Chyby: " + errorsCount + "\n";
}

summaryMessage += "\nℹ️ Detaily v poli 'info'";

utils.addDebug(currentEntry, "🎯 Nastavenie dokončené:");
utils.addDebug(currentEntry, "  • Aktualizované: " + updatedCount);
utils.addDebug(currentEntry, "  • Preskočené: " + skippedCount);
utils.addDebug(currentEntry, "  • Chyby: " + errorsCount);

message(summaryMessage);