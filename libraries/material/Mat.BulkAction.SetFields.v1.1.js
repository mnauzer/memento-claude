// ==============================================
// MEMENTO DATABASE - MATERIÁL NASTAVENIE POLÍ BULK ACTION
// Verzia: 1.1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Bulk Action
// ==============================================
// 📋 FUNKCIA:
//    - Hromadné nastavenie polí pre prepočet cien označených materiálov
//    - Nastavuje polia pre prepočet na vybraných záznamoch
//    - Umožňuje jednotne nakonfigurovať označené materiály
//    - Vytvorí info záznam pre každý upravený materiál
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoCore (dialógy, logging)
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
    version: "1.1.0",

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
        roundingValue: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.roundingValue) || "Hodnota zaokrúhenia",
        purchasePriceChange: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePriceChange) || "Zmena nákupnej ceny",
        changePercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.changePercentage) || "Percento zmeny",
        icons: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.icons) || "icons",

        // Spoločné polia
        debugLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.debugLog) || "Debug_Log",
        errorLog: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.errorLog) || "Error_Log",
        info: (centralConfig.fields && centralConfig.fields.common && centralConfig.fields.common.info) || "info"
    },

    // Ikony
    icons: (centralConfig.icons) || {
        start: "🚀",
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        settings: "⚙️",
        processing: "🔧",
        material: "📦"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        // Inicializácia štatistík
        var stats = {
            total: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            processedMaterials: []
        };

        utils.addDebug(entry(), CONFIG.icons.start + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // Získanie označených záznamov
        var selectedMaterials = getSelectedMaterials();
        if (!selectedMaterials || selectedMaterials.length === 0) {
            utils.showErrorDialog("⚠️ UPOZORNENIE\n\nŽiadne záznamy nie sú označené!\n\nPre použitie bulk action označte materiály, ktoré chcete upraviť.");
            return false;
        }

        stats.total = selectedMaterials.length;
        utils.addDebug(entry(), CONFIG.icons.info + " Označených materiálov: " + stats.total);

        // Získanie a validácia argumentov
        var arguments = getAndValidateArguments();
        if (!arguments.isValid) {
            utils.showErrorDialog("❌ CHYBA ARGUMENTOV\n\n" + arguments.errorMessage);
            return false;
        }

        utils.addDebug(entry(), CONFIG.icons.info + " Argumenty úspešne načítané");

        // Spracovanie materiálov
        for (var i = 0; i < selectedMaterials.length; i++) {
            var material = selectedMaterials[i];
            processMaterial(material, arguments, stats);
        }

        // Vytvorenie zhrnutia
        createSummary(stats, arguments);

        // Zobrazenie výsledkov
        showResults(stats);

        return true;

    } catch (error) {
        utils.addError(entry(), "Kritická chyba v hlavnej funkcii", "main", error);
        utils.showErrorDialog("Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// ZÍSKANIE OZNAČENÝCH ZÁZNAMOV
// ==============================================

function getSelectedMaterials() {
    try {
        var selectedMaterials = selectedEntries();
        utils.addDebug(entry(), CONFIG.icons.info + " Získané označené záznamy: " + (selectedMaterials ? selectedMaterials.length : 0));
        return selectedMaterials;
    } catch (error) {
        utils.addError(entry(), "Chyba pri získavaní označených záznamov", "getSelectedMaterials", error);
        return [];
    }
}

// ==============================================
// ZÍSKANIE A VALIDÁCIA ARGUMENTOV
// ==============================================

function getAndValidateArguments() {
    try {
        var arguments = {
            priceCalculation: getSafeArgument("Prepočet ceny", ""),
            markupPercentage: getSafeArgument("Obchodná prirážka", null),
            priceRounding: getSafeArgument("Zaokrúhľovanie cien", ""),
            roundingValue: getSafeArgument("Hodnota zaokrúhenia", ""),
            purchasePriceChange: getSafeArgument("Zmena nákupnej ceny", ""),
            changePercentage: getSafeArgument("Percento zmeny", null),
            isValid: true,
            errorMessage: ""
        };

        // Kontrola či aspoň jeden argument je zadaný
        var hasAnyArgument = false;
        if (arguments.priceCalculation && arguments.priceCalculation.trim() !== "") hasAnyArgument = true;
        if (arguments.markupPercentage !== null && !isNaN(arguments.markupPercentage)) hasAnyArgument = true;
        if (arguments.priceRounding && arguments.priceRounding.trim() !== "") hasAnyArgument = true;
        if (arguments.roundingValue && arguments.roundingValue.trim() !== "") hasAnyArgument = true;
        if (arguments.purchasePriceChange && arguments.purchasePriceChange.trim() !== "") hasAnyArgument = true;
        if (arguments.changePercentage !== null && !isNaN(arguments.changePercentage)) hasAnyArgument = true;

        if (!hasAnyArgument) {
            arguments.isValid = false;
            arguments.errorMessage = "Nie je zadaný žiadny argument!\n\nZadajte aspoň jednu hodnotu pre nastavenie.";
        }

        utils.addDebug(entry(), CONFIG.icons.info + " Argumenty - priceCalculation: " + arguments.priceCalculation +
                      ", markupPercentage: " + arguments.markupPercentage +
                      ", priceRounding: " + arguments.priceRounding);

        return arguments;

    } catch (error) {
        utils.addError(entry(), "Chyba pri získavaní argumentov", "getAndValidateArguments", error);
        return {
            isValid: false,
            errorMessage: "Chyba pri spracovaní argumentov: " + error.toString()
        };
    }
}

function getSafeArgument(argName, defaultValue) {
    try {
        var value = arg(argName);
        return value !== null && value !== undefined ? value : defaultValue;
    } catch (error) {
        utils.addError(entry(), "Chyba pri získavaní argumentu", "getSafeArgument", error + " (argument: " + argName + ")");
        return defaultValue;
    }
}

// ==============================================
// SPRACOVANIE MATERIÁLU
// ==============================================

function processMaterial(material, arguments, stats) {
    try {
        var materialName = utils.safeGet(material, CONFIG.materialFields.name, "Neznámy materiál");
        var hasChanges = false;
        var materialChanges = [];

        utils.addDebug(material, CONFIG.icons.processing + " Spracovávam materiál: " + materialName);

        // Vyčistenie logov materiálu
        utils.clearLogs(material, [CONFIG.materialFields.debugLog, CONFIG.materialFields.errorLog]);

        // Nastavenie jednotlivých polí
        hasChanges = setPriceCalculation(material, arguments.priceCalculation, materialChanges) || hasChanges;
        hasChanges = setMarkupPercentage(material, arguments.markupPercentage, materialChanges) || hasChanges;
        hasChanges = setPriceRounding(material, arguments.priceRounding, materialChanges) || hasChanges;
        hasChanges = setRoundingValue(material, arguments.roundingValue, materialChanges) || hasChanges;
        hasChanges = setPurchasePriceChange(material, arguments.purchasePriceChange, materialChanges) || hasChanges;
        hasChanges = setChangePercentage(material, arguments.changePercentage, materialChanges) || hasChanges;

        if (hasChanges) {
            // Pridanie ikony indikujúcej nastavenie
            addSettingsIcon(material);

            // Vytvorenie info záznamu pre tento materiál
            createMaterialInfoRecord(material, materialChanges, arguments);

            stats.updated++;
            stats.processedMaterials.push({
                name: materialName,
                changes: materialChanges,
                status: "updated"
            });

            utils.addDebug(material, CONFIG.icons.success + " Materiál úspešne aktualizovaný s " + materialChanges.length + " zmenami");
        } else {
            stats.skipped++;
            stats.processedMaterials.push({
                name: materialName,
                changes: [],
                status: "skipped"
            });

            utils.addDebug(material, CONFIG.icons.info + " Materiál preskočený - žiadne zmeny");
        }

    } catch (error) {
        utils.addError(material, "Chyba pri spracovaní materiálu", "processMaterial", error);
        stats.errors++;
        stats.processedMaterials.push({
            name: materialName || "Neznámy materiál",
            changes: [],
            status: "error",
            error: error.toString()
        });
    }
}

// ==============================================
// NASTAVENIE JEDNOTLIVÝCH POLÍ
// ==============================================

function setPriceCalculation(material, value, changes) {
    if (!value || value.trim() === "") return false;

    var currentValue = utils.safeGet(material, CONFIG.materialFields.priceCalculation, "");
    if (currentValue !== value) {
        utils.safeSet(material, CONFIG.materialFields.priceCalculation, value);
        changes.push("Prepočet ceny: '" + currentValue + "' → '" + value + "'");
        utils.addDebug(material, CONFIG.icons.settings + " Nastavený prepočet ceny: " + value);
        return true;
    }
    return false;
}

function setMarkupPercentage(material, value, changes) {
    if (value === null || isNaN(value)) return false;

    var currentValue = parseFloat(utils.safeGet(material, CONFIG.materialFields.markupPercentage, 0));
    if (Math.abs(currentValue - value) > 0.01) {
        utils.safeSet(material, CONFIG.materialFields.markupPercentage, value);
        changes.push("Obchodná prirážka: " + currentValue + "% → " + value + "%");
        utils.addDebug(material, CONFIG.icons.settings + " Nastavená obchodná prirážka: " + value + "%");
        return true;
    }
    return false;
}

function setPriceRounding(material, value, changes) {
    if (!value || value.trim() === "") return false;

    var currentValue = utils.safeGet(material, CONFIG.materialFields.priceRounding, "");
    if (currentValue !== value) {
        utils.safeSet(material, CONFIG.materialFields.priceRounding, value);
        changes.push("Zaokrúhľovanie: '" + currentValue + "' → '" + value + "'");
        utils.addDebug(material, CONFIG.icons.settings + " Nastavené zaokrúhľovanie: " + value);
        return true;
    }
    return false;
}

function setRoundingValue(material, value, changes) {
    if (!value || value.trim() === "") return false;

    var currentValue = utils.safeGet(material, CONFIG.materialFields.roundingValue, "");
    if (currentValue !== value) {
        utils.safeSet(material, CONFIG.materialFields.roundingValue, value);
        changes.push("Hodnota zaokrúhľovania: '" + currentValue + "' → '" + value + "'");
        utils.addDebug(material, CONFIG.icons.settings + " Nastavená hodnota zaokrúhľovania: " + value);
        return true;
    }
    return false;
}

function setPurchasePriceChange(material, value, changes) {
    if (!value || value.trim() === "") return false;

    var currentValue = utils.safeGet(material, CONFIG.materialFields.purchasePriceChange, "");
    if (currentValue !== value) {
        utils.safeSet(material, CONFIG.materialFields.purchasePriceChange, value);
        changes.push("Zmena nákupnej ceny: '" + currentValue + "' → '" + value + "'");
        utils.addDebug(material, CONFIG.icons.settings + " Nastavená zmena nákupnej ceny: " + value);
        return true;
    }
    return false;
}

function setChangePercentage(material, value, changes) {
    if (value === null || isNaN(value)) return false;

    var currentValue = parseFloat(utils.safeGet(material, CONFIG.materialFields.changePercentage, 0));
    if (Math.abs(currentValue - value) > 0.01) {
        utils.safeSet(material, CONFIG.materialFields.changePercentage, value);
        changes.push("Percento zmeny: " + currentValue + "% → " + value + "%");
        utils.addDebug(material, CONFIG.icons.settings + " Nastavené percento zmeny: " + value + "%");
        return true;
    }
    return false;
}

// ==============================================
// POMOCNÉ FUNKCIE
// ==============================================

function addSettingsIcon(material) {
    try {
        var currentIcons = utils.safeGet(material, CONFIG.materialFields.icons, "");
        var newIcon = CONFIG.icons.settings;
        if (!currentIcons.includes(newIcon)) {
            var updatedIcons = currentIcons ? currentIcons + " " + newIcon : newIcon;
            utils.safeSet(material, CONFIG.materialFields.icons, updatedIcons);
            utils.addDebug(material, CONFIG.icons.info + " Pridaná ikona nastavenia");
        }
    } catch (error) {
        utils.addError(material, "Chyba pri pridávaní ikony", "addSettingsIcon", error);
    }
}

function createMaterialInfoRecord(material, changes, arguments) {
    try {
        var materialName = utils.safeGet(material, CONFIG.materialFields.name, "Neznámy materiál");
        var dateFormatted = utils.formatDate(new Date(), "DD.MM.YYYY HH:mm:ss");

        var infoMessage = CONFIG.icons.settings + " NASTAVENIE POLÍ MATERIÁLU\n";
        infoMessage += "═══════════════════════════════════════════\n";
        infoMessage += "📦 Materiál: " + materialName + "\n";
        infoMessage += "📅 Dátum: " + dateFormatted + "\n";
        infoMessage += "🔧 Script: " + CONFIG.scriptName + " v" + CONFIG.version + "\n\n";

        infoMessage += "⚙️ NASTAVENÉ HODNOTY:\n";
        infoMessage += "───────────────────────────────────────────\n";
        if (arguments.priceCalculation && arguments.priceCalculation.trim() !== "") {
            infoMessage += "• Prepočet ceny: " + arguments.priceCalculation + "\n";
        }
        if (arguments.markupPercentage !== null && !isNaN(arguments.markupPercentage)) {
            infoMessage += "• Obchodná prirážka: " + arguments.markupPercentage + "%\n";
        }
        if (arguments.priceRounding && arguments.priceRounding.trim() !== "") {
            infoMessage += "• Zaokrúhľovanie cien: " + arguments.priceRounding + "\n";
        }
        if (arguments.roundingValue && arguments.roundingValue.trim() !== "") {
            infoMessage += "• Hodnota zaokrúhľovania: " + arguments.roundingValue + "\n";
        }
        if (arguments.purchasePriceChange && arguments.purchasePriceChange.trim() !== "") {
            infoMessage += "• Zmena nákupnej ceny: " + arguments.purchasePriceChange + "\n";
        }
        if (arguments.changePercentage !== null && !isNaN(arguments.changePercentage)) {
            infoMessage += "• Percento zmeny: " + arguments.changePercentage + "%\n";
        }

        if (changes.length > 0) {
            infoMessage += "\n🔄 VYKONANÉ ZMENY:\n";
            infoMessage += "───────────────────────────────────────────\n";
            for (var i = 0; i < changes.length; i++) {
                infoMessage += "• " + changes[i] + "\n";
            }
        }

        infoMessage += "\n" + CONFIG.icons.success + " NASTAVENIE DOKONČENÉ";

        // Nastavenie info záznamu
        utils.safeSet(material, CONFIG.materialFields.info, infoMessage);
        utils.addDebug(material, CONFIG.icons.info + " Info záznam vytvorený");

    } catch (error) {
        utils.addError(material, "Chyba pri vytváraní info záznamu", "createMaterialInfoRecord", error);
    }
}

// ==============================================
// VYTVORENIE ZHRNUTIA
// ==============================================

function createSummary(stats, arguments) {
    try {
        utils.addDebug(entry(), CONFIG.icons.info + " Vytváram zhrnutie operácie");
        utils.addDebug(entry(), "📊 Štatistiky - Celkom: " + stats.total + ", Aktualizované: " + stats.updated +
                      ", Preskočené: " + stats.skipped + ", Chyby: " + stats.errors);
    } catch (error) {
        utils.addError(entry(), "Chyba pri vytváraní zhrnutia", "createSummary", error);
    }
}

// ==============================================
// ZOBRAZENIE VÝSLEDKOV
// ==============================================

function showResults(stats) {
    try {
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

        if (stats.updated > 0) {
            summaryMessage += "\n" + CONFIG.icons.info + " Detaily v každom aktualizovanom materiáli v poli 'info'";
        }

        if (isSuccess) {
            utils.showSuccessDialog(summaryMessage);
        } else {
            utils.showErrorDialog(summaryMessage);
        }

        utils.addDebug(entry(), CONFIG.icons.success + " Výsledky zobrazené užívateľovi");

    } catch (error) {
        utils.addError(entry(), "Chyba pri zobrazovaní výsledkov", "showResults", error);
        utils.showErrorDialog("Chyba pri zobrazovaní výsledkov!\n\n" + error.toString());
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();