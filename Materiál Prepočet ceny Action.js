// ==============================================
// MEMENTO DATABASE - MATERIÁL PREPOČET CENY ACTION
// Verzia: 1.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Manuálny prepočet cien materiálu
//    - Zadanie nákupnej ceny cez dialogové okno
//    - Kontrola zmeny nákupnej ceny podľa nastavení
//    - Automatický prepočet predajných cien
//    - Aktualizácia ikon podľa zmeny ceny
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoBusiness (business logika pre ceny materiálu)
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Materiál Prepočet ceny Action",
    version: "1.0.0",

    // Knižnice
    libraries: {
        inventory: (centralConfig.libraries && centralConfig.libraries.inventory) || "Materiál",
        vatRates: (centralConfig.libraries && centralConfig.libraries.vatRatesLib) || "sadzby DPH"
    },

    // Polia Materiál
    materialFields: {
        name: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.name) || "Názov",
        purchasePrice: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePrice) || "Nákupná cena",
        purchasePriceWithVat: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.purchasePriceWithVat) || "Nákupná cena s DPH",
        price: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.price) || "Cena",
        priceWithVat: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceWithVat) || "Cena s DPH",
        priceCalculation: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceCalculation) || "Prepočet ceny",
        markupPercentage: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.markupPercentage) || "Obchodná prirážka",
        priceRounding: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.priceRounding) || "Zaokrúhľovanie cien",
        roundingValue: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.roundingValue) || "Hodnota zaokrúhenia",
        vatRate: (centralConfig.fields && centralConfig.fields.items && centralConfig.fields.items.vatRate) || "sadzba DPH",
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
        money: "💰",
        calculation: "🧮",
        material: "📦"
    }
};

// ==============================================
// HLAVNÁ FUNKCIA
// ==============================================

function main() {
    try {
        utils.clearLogs(currentEntry, [CONFIG.materialFields.debugLog, CONFIG.materialFields.errorLog]);
        utils.addDebug(currentEntry, CONFIG.icons.start + " === ŠTART " + CONFIG.scriptName + " v" + CONFIG.version + " ===");

        // Získanie názvu materiálu pre dialóg
        var materialName = utils.safeGet(currentEntry, CONFIG.materialFields.name, "Neznámy materiál");
        var currentPurchasePrice = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.purchasePrice, 0));

        utils.addDebug(currentEntry, CONFIG.icons.material + " Materiál: " + materialName);
        utils.addDebug(currentEntry, CONFIG.icons.info + " Aktuálna nákupná cena: " + utils.formatMoney(currentPurchasePrice));

        // Zobrazenie dialógu pre zadanie novej nákupnej ceny
        showPurchasePriceDialog(materialName, currentPurchasePrice);

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        showErrorDialog("Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// DIALÓGOVÉ FUNKCIE
// ==============================================

/**
 * Zobrazí dialóg pre zadanie novej nákupnej ceny
 */
function showPurchasePriceDialog(materialName, currentPrice) {
    try {
        var dialogMessage = "💰 PREPOČET CENY MATERIÁLU\n\n";
        dialogMessage += "📦 Materiál: " + materialName + "\n";
        if (currentPrice > 0) {
            dialogMessage += "💶 Aktuálna nákupná cena: " + utils.formatMoney(currentPrice) + "\n\n";
        } else {
            dialogMessage += "💶 Aktuálna nákupná cena: nie je nastavená\n\n";
        }
        dialogMessage += "Zadajte novú nákupnú cenu:";

        // Vytvorenie dialógu s input poľom
        dialog()
            .title("Prepočet ceny materiálu")
            .text(dialogMessage)
            .textInput("purchasePrice", "Nákupná cena", currentPrice > 0 ? currentPrice.toString() : "")
            .positiveButton("PREPOČÍTAŤ", function(results) {
                processPriceCalculation(results.purchasePrice, materialName);
            })
            .negativeButton("ZRUŠIŤ", function() {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Prepočet zrušený používateľom");
                showCancelDialog();
            })
            .show();

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri zobrazení dialógu", "showPurchasePriceDialog", error);
        showErrorDialog("Chyba pri zobrazení dialógu!\n\n" + error.toString());
    }
}

/**
 * Spracuje prepočet cien s novou nákupnou cenou
 */
function processPriceCalculation(inputPrice, materialName) {
    try {
        // Validácia vstupu
        var purchasePrice = parseFloat(inputPrice);
        if (isNaN(purchasePrice) || purchasePrice < 0) {
            showErrorDialog("❌ CHYBA VSTUPU\n\nNákupná cena musí byť číslo väčšie alebo rovné 0!\n\nZadali ste: '" + inputPrice + "'");
            return false;
        }

        utils.addDebug(currentEntry, CONFIG.icons.money + " Nová nákupná cena: " + utils.formatMoney(purchasePrice));

        // Zobrazenie potvrdzovacieho dialógu
        var confirmMessage = "💰 POTVRDENIE PREPOČTU\n\n";
        confirmMessage += "📦 Materiál: " + materialName + "\n";
        confirmMessage += "💶 Nová nákupná cena: " + utils.formatMoney(purchasePrice) + "\n\n";
        confirmMessage += "⚙️ Prepočet sa vykoná podľa nastavení materiálu:\n";

        var priceCalculation = utils.safeGet(currentEntry, CONFIG.materialFields.priceCalculation, "");
        if (priceCalculation) {
            confirmMessage += "• Prepočet ceny: " + priceCalculation + "\n";
        }

        var markupPercentage = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.markupPercentage, 0));
        if (markupPercentage > 0) {
            confirmMessage += "• Obchodná prirážka: " + markupPercentage + "%\n";
        }

        var vatRateType = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "Základná");
        confirmMessage += "• Sadzba DPH: " + vatRateType + "\n";

        var priceRounding = utils.safeGet(currentEntry, CONFIG.materialFields.priceRounding, "");
        if (priceRounding && priceRounding !== "Nezaokrúhľovať") {
            var roundingValue = utils.safeGet(currentEntry, CONFIG.materialFields.roundingValue, "");
            confirmMessage += "• Zaokrúhľovanie: " + priceRounding + " (" + roundingValue + ")\n";
        }

        confirmMessage += "\n⚠️ Aktuálne ceny budú prepísané!\n\nPokračovať?";

        dialog()
            .title("Potvrdenie prepočtu")
            .text(confirmMessage)
            .positiveButton("ÁNOÍ", function() {
                executeCalculation(purchasePrice, materialName);
            })
            .negativeButton("NIE", function() {
                utils.addDebug(currentEntry, CONFIG.icons.warning + " Prepočet zrušený po potvrdení");
                showCancelDialog();
            })
            .show();

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní vstupu", "processPriceCalculation", error);
        showErrorDialog("Chyba pri spracovaní!\n\n" + error.toString());
    }
}

/**
 * Vykoná skutočný prepočet cien
 */
function executeCalculation(purchasePrice, materialName) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Spúšťam prepočet cien...");

        // Použitie funkcie z MementoBusiness modulu
        var result = utils.calculateAndUpdateMaterialPrices(
            currentEntry,
            purchasePrice,
            new Date() // Použije aktuálny dátum
        );

        if (result.success) {
            // Úspešný prepočet
            utils.addDebug(currentEntry, CONFIG.icons.success + " Prepočet cien úspešne dokončený");

            var successMessage = "✅ PREPOČET ÚSPEŠNÝ!\n\n";
            successMessage += "📦 Materiál: " + materialName + "\n";
            successMessage += "💶 Nákupná cena: " + utils.formatMoney(purchasePrice) + "\n";
            successMessage += "💰 Predajná cena: " + utils.formatMoney(result.sellingPrice) + "\n";
            successMessage += "💰 Cena s DPH: " + utils.formatMoney(result.priceWithVat) + "\n\n";
            successMessage += "📊 Všetky ceny boli aktualizované!";

            if (result.updated) {
                successMessage += "\n\n📝 Info záznam bol vytvorený s podrobnosťami prepočtu.";
            }

            showSuccessDialog(successMessage);

        } else {
            // Prepočet zlyhal
            utils.addError(currentEntry, "Prepočet cien zlyhal", "executeCalculation");
            showErrorDialog("❌ CHYBA PREPOČTU\n\nPrepočet cien sa nepodarilo dokončiť.\n\nSkontrolujte nastavenia materiálu a skúste znova.");
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vykonávaní prepočtu", "executeCalculation", error);
        showErrorDialog("Kritická chyba pri prepočte!\n\n" + error.toString());
    }
}

// ==============================================
// POMOCNÉ DIALÓGY
// ==============================================

/**
 * Zobrazí dialóg s chybou
 */
function showErrorDialog(message) {
    dialog()
        .title("CHYBA")
        .text(message)
        .positiveButton("OK", function() {})
        .show();
}

/**
 * Zobrazí dialóg s úspechom
 */
function showSuccessDialog(message) {
    dialog()
        .title("ÚSPECH")
        .text(message)
        .positiveButton("OK", function() {})
        .show();
}

/**
 * Zobrazí dialóg pri zrušení
 */
function showCancelDialog() {
    dialog()
        .title("Zrušené")
        .text("❌ Prepočet ceny bol zrušený")
        .positiveButton("OK", function() {})
        .show();
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();