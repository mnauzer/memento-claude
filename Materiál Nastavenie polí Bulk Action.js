// ==============================================
// MEMENTO DATABASE - MATERIÁL NASTAVENIE POLÍ BULK ACTION
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Bulk Action
// ==============================================
// 📋 FUNKCIA:
//    - Hromadné nastavenie polí pre prepočet cien označených materiálov
//    - Nastavuje polia pre prepočet na vybraných záznamoch
//    - Umožňuje jednotne nakonfigurovať označené materiály
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

var CONFIG = {
    scriptName: "Materiál Nastavenie polí Bulk Action",
    version: "1.0.0",

    // Polia Materiál
    materialFields: {
        name: config.fields.items.name || "Názov",
        category: config.fields.items.category || "Kategória",
        priceCalculation: config.fields.items.priceCalculation || "Prepočet ceny",
        markupPercentage: config.fields.items.markupPercentage || "Obchodná prirážka",
        priceRounding: config.fields.items.priceRounding || "Zaokrúhľovanie cien",
        roundingValue: config.fields.items.roundingValue || "Hodnota zaokrúhelia",
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
        // Fallback na prázdnu hodnotu ak argument nie je zadaný
        return defaultValue;
    }
}

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
    message("❌ CHYBA: Nepodarilo sa získať označené záznamy: " + error.toString());
    return;
}

if (!selectedMaterials || selectedMaterials.length === 0) {
    message("⚠️ UPOZORNENIE: Žiadne záznamy nie sú označené!\n\nPre použitie bulk action označte materiály, ktoré chcete upraviť.");
    return;
}

// ==============================================
// INICIALIZÁCIA ŠTATISTÍK A LOGOV
// ==============================================

var stats = {
    total: selectedMaterials.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    categories: {},
    processedMaterials: []
};

var globalDebugLog = "";
var globalErrorLog = "";

function addGlobalDebug(message) {
    globalDebugLog += utils.formatDate(moment(), "HH:mm:ss") + " " + message + "\n";
}

function addGlobalError(message, error) {
    var errorMsg = message;
    if (error && error.stack) {
        errorMsg += "\nStack: " + error.stack;
    }
    globalErrorLog += utils.formatDate(moment(), "HH:mm:ss") + " " + errorMsg + "\n";
}

addGlobalDebug("🚀 " + CONFIG.scriptName + " v" + CONFIG.version);
addGlobalDebug("📦 Spúšťam nastavenie polí pre " + stats.total + " označených materiálov...");

addGlobalDebug("🔍 Parametre:");
addGlobalDebug("  • Prepočet ceny: '" + priceCalculation + "'");
addGlobalDebug("  • Obchodná prirážka: " + (markupPercentage !== null ? markupPercentage + "%" : "nezadané"));
addGlobalDebug("  • Zaokrúhľovanie: '" + priceRounding + "'");
addGlobalDebug("  • Hodnota zaokrúhľovania: '" + roundingValue + "'");
addGlobalDebug("  • Zmena nákupnej ceny: '" + purchasePriceChange + "'");
addGlobalDebug("  • Percento zmeny: " + (changePercentage !== null ? changePercentage + "%" : "nezadané"));

// ==============================================
// SPRACOVANIE KAŽDÉHO OZNAČENÉHO MATERIÁLU
// ==============================================

for (var i = 0; i < selectedMaterials.length; i++) {
    var material = selectedMaterials[i];
    var materialName = utils.safeGet(material, CONFIG.materialFields.name, "Neznámy materiál");
    var materialCategory = utils.safeGet(material, CONFIG.materialFields.category, "Bez kategórie");
    var hasChanges = false;
    var materialChanges = [];

    try {
        addGlobalDebug("📦 [" + (i + 1) + "/" + stats.total + "] " + materialName);

        // Sledovanie kategórií
        if (!stats.categories[materialCategory]) {
            stats.categories[materialCategory] = 0;
        }
        stats.categories[materialCategory]++;

        // Nastavenie Prepočet ceny
        if (priceCalculation && priceCalculation.trim() !== "") {
            var currentPriceCalculation = utils.safeGet(material, CONFIG.materialFields.priceCalculation, "");
            if (currentPriceCalculation !== priceCalculation) {
                utils.safeSet(material, CONFIG.materialFields.priceCalculation, priceCalculation);
                materialChanges.push("Prepočet ceny: '" + currentPriceCalculation + "' → '" + priceCalculation + "'");
                addGlobalDebug("  ✅ Prepočet ceny: '" + currentPriceCalculation + "' → '" + priceCalculation + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Obchodná prirážka
        if (markupPercentage !== null && !isNaN(markupPercentage)) {
            var currentMarkup = parseFloat(utils.safeGet(material, CONFIG.materialFields.markupPercentage, 0));
            if (Math.abs(currentMarkup - markupPercentage) > 0.01) {
                utils.safeSet(material, CONFIG.materialFields.markupPercentage, markupPercentage);
                materialChanges.push("Obchodná prirážka: " + currentMarkup + "% → " + markupPercentage + "%");
                addGlobalDebug("  ✅ Obchodná prirážka: " + currentMarkup + "% → " + markupPercentage + "%");
                hasChanges = true;
            }
        }

        // Nastavenie Zaokrúhľovanie cien
        if (priceRounding && priceRounding.trim() !== "") {
            var currentRounding = utils.safeGet(material, CONFIG.materialFields.priceRounding, "");
            if (currentRounding !== priceRounding) {
                utils.safeSet(material, CONFIG.materialFields.priceRounding, priceRounding);
                materialChanges.push("Zaokrúhľovanie: '" + currentRounding + "' → '" + priceRounding + "'");
                addGlobalDebug("  ✅ Zaokrúhľovanie: '" + currentRounding + "' → '" + priceRounding + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Hodnota zaokrúhľovania
        if (roundingValue && roundingValue.trim() !== "") {
            var currentRoundingValue = utils.safeGet(material, CONFIG.materialFields.roundingValue, "");
            if (currentRoundingValue !== roundingValue) {
                utils.safeSet(material, CONFIG.materialFields.roundingValue, roundingValue);
                materialChanges.push("Hodnota zaokrúhľovania: '" + currentRoundingValue + "' → '" + roundingValue + "'");
                addGlobalDebug("  ✅ Hodnota zaokrúhľovania: '" + currentRoundingValue + "' → '" + roundingValue + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Zmena nákupnej ceny
        if (purchasePriceChange && purchasePriceChange.trim() !== "") {
            var currentPriceChange = utils.safeGet(material, CONFIG.materialFields.purchasePriceChange, "");
            if (currentPriceChange !== purchasePriceChange) {
                utils.safeSet(material, CONFIG.materialFields.purchasePriceChange, purchasePriceChange);
                materialChanges.push("Zmena nákupnej ceny: '" + currentPriceChange + "' → '" + purchasePriceChange + "'");
                addGlobalDebug("  ✅ Zmena nákupnej ceny: '" + currentPriceChange + "' → '" + purchasePriceChange + "'");
                hasChanges = true;
            }
        }

        // Nastavenie Percento zmeny
        if (changePercentage !== null && !isNaN(changePercentage)) {
            var currentChangePercentage = parseFloat(utils.safeGet(material, CONFIG.materialFields.changePercentage, 0));
            if (Math.abs(currentChangePercentage - changePercentage) > 0.01) {
                utils.safeSet(material, CONFIG.materialFields.changePercentage, changePercentage);
                materialChanges.push("Percento zmeny: " + currentChangePercentage + "% → " + changePercentage + "%");
                addGlobalDebug("  ✅ Percento zmeny: " + currentChangePercentage + "% → " + changePercentage + "%");
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
                addGlobalDebug("  🎯 Pridaná ikona: " + newIcon);
            }

            stats.updated++;
            addGlobalDebug("  ✅ Materiál aktualizovaný");

            // Uloženie informácií o materiáli pre súhrn
            stats.processedMaterials.push({
                name: materialName,
                category: materialCategory,
                changes: materialChanges,
                status: "updated"
            });
        } else {
            stats.skipped++;
            addGlobalDebug("  ➖ Žiadne zmeny");

            stats.processedMaterials.push({
                name: materialName,
                category: materialCategory,
                changes: [],
                status: "skipped"
            });
        }

    } catch (error) {
        stats.errors++;
        var errorMessage = "Chyba pri spracovaní materiálu '" + materialName + "': " + error.toString();
        addGlobalError(errorMessage, error);
        addGlobalDebug("  ❌ Chyba pri spracovaní");

        stats.processedMaterials.push({
            name: materialName,
            category: materialCategory,
            changes: [],
            status: "error",
            error: error.toString()
        });
    }
}

// ==============================================
// VYTVORENIE SÚHRNNÉHO INFO ZÁZNAMU
// ==============================================

// Vytvoríme jeden súhrnný záznam v prvom materiáli
var firstMaterial = selectedMaterials[0];

var infoMessage = "⚙️ HROMADNÉ NASTAVENIE POLÍ MATERIÁLOV (BULK)\n";
infoMessage += "════════════════════════════════════════════════\n";
infoMessage += "📅 Dátum: " + utils.formatDate(moment(), "DD.MM.YYYY HH:mm:ss") + "\n";
infoMessage += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n";

infoMessage += "📊 SÚHRN SPRACOVANIA:\n";
infoMessage += "───────────────────────────────────────────────\n";
infoMessage += "• Označené materiály: " + stats.total + "\n";
infoMessage += "• Aktualizované: " + stats.updated + "\n";
infoMessage += "• Preskočené (bez zmien): " + stats.skipped + "\n";
infoMessage += "• Chyby: " + stats.errors + "\n\n";

// Kategórie
if (Object.keys(stats.categories).length > 0) {
    infoMessage += "📦 KATEGÓRIE MATERIÁLOV:\n";
    infoMessage += "───────────────────────────────────────────────\n";
    for (var category in stats.categories) {
        infoMessage += "• " + category + ": " + stats.categories[category] + " materiálov\n";
    }
    infoMessage += "\n";
}

infoMessage += "⚙️ NASTAVENÉ HODNOTY:\n";
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

// Detaily materiálov s aktualizáciami
if (stats.updated > 0) {
    infoMessage += "\n✅ AKTUALIZOVANÉ MATERIÁLY:\n";
    infoMessage += "───────────────────────────────────────────────\n";
    var updatedCount = 0;
    for (var i = 0; i < stats.processedMaterials.length && updatedCount < 10; i++) {
        var mat = stats.processedMaterials[i];
        if (mat.status === "updated") {
            infoMessage += "• " + mat.name + " (" + mat.category + ")\n";
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

// Chyby
if (stats.errors > 0) {
    infoMessage += "\n❌ CHYBY:\n";
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

infoMessage += "\n✅ NASTAVENIE DOKONČENÉ";

// Nastavenie info záznamu do prvého materiálu
utils.safeSet(firstMaterial, CONFIG.materialFields.name + " (Súhrn)", firstMaterial.field(CONFIG.materialFields.name) + " (Súhrn)");
utils.safeSet(firstMaterial, CONFIG.commonFields.info, infoMessage);
utils.safeSet(firstMaterial, CONFIG.commonFields.debugLog, globalDebugLog);
if (globalErrorLog) {
    utils.safeSet(firstMaterial, CONFIG.commonFields.errorLog, globalErrorLog);
}

// ==============================================
// FINÁLNY DIALOG
// ==============================================

var isSuccess = stats.errors === 0;
var summaryMessage = "";

if (isSuccess) {
    summaryMessage = "✅ ÚSPEŠNE DOKONČENÉ\n\n";
} else {
    summaryMessage = "⚠️ DOKONČENÉ S CHYBAMI\n\n";
}

summaryMessage += "📦 Označené materiály: " + stats.total + "\n";
summaryMessage += "✅ Aktualizované: " + stats.updated + "\n";
summaryMessage += "➖ Preskočené: " + stats.skipped + "\n";

if (stats.errors > 0) {
    summaryMessage += "❌ Chyby: " + stats.errors + "\n";
}

summaryMessage += "\nℹ️ Detaily v prvom materiáli v poli 'info'";

addGlobalDebug("🎯 Nastavenie dokončené:");
addGlobalDebug("  • Aktualizované: " + stats.updated);
addGlobalDebug("  • Preskočené: " + stats.skipped);
addGlobalDebug("  • Chyby: " + stats.errors);

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Vytvori\u0165 bulk action verziu scriptu bez v\u00fdberu kateg\u00f3rie", "status": "completed", "activeForm": "Vytvoren\u00e1 bulk action verzia scriptu"}]