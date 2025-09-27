// ==============================================
// MEMENTO DATABASE - MATERIÁL PREPOČET CENY ACTION
// Verzia: 1.2 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Manual Action
// ==============================================
// 📋 FUNKCIA:
//    - Manuálny prepočet cien materiálu
//    - Argumenty: "nákupná cena" (číslo) + "dph" (s DPH/bez DPH)
//    - Automatický prepočet ceny bez DPH ak je zadaná s DPH
//    - Kontrola zmeny nákupnej ceny podľa nastavení
//    - Automatický prepočet predajných cien
//    - Aktualizácia ikon podľa zmeny ceny
//    - Automatické vytvorenie/aktualizácia cenovej histórie
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoBusiness (business logika pre ceny materiálu)
// 📝 ARGUMENTY:
//    - "nákupná cena" (Number): Nová nákupná cena materiálu
//    - "dph" (Options: "s DPH", "bez DPH"): Či je zadaná cena s/bez DPH
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
    version: "1.2.0",

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

        // Získanie názvu materiálu a aktuálnej ceny
        var materialName = utils.safeGet(currentEntry, CONFIG.materialFields.name, "Neznámy materiál");
        var currentPurchasePrice = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.purchasePrice, 0));

        utils.addDebug(currentEntry, CONFIG.icons.material + " Materiál: " + materialName);
        utils.addDebug(currentEntry, CONFIG.icons.info + " Aktuálna nákupná cena: " + utils.formatMoney(currentPurchasePrice));

        // Získanie argumentov
        var newPurchasePrice = arg("nákupná cena");
        var dphOption = arg("dph");

        // Validácia argumentu DPH (nákupná cena môže byť prázdna)
        if (dphOption === null || dphOption === undefined || dphOption === "") {
            utils.showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'dph' nie je zadaný!\\n\\nVyberte: 's DPH' alebo 'bez DPH'.");
            return false;
        }

        // Validácia hodnoty DPH argumentu
        if (dphOption !== "s DPH" && dphOption !== "bez DPH") {
            utils.showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'dph' má neplatnú hodnotu: '" + dphOption + "'\\n\\nPovolené hodnoty: 's DPH', 'bez DPH'.");
            return false;
        }

        // Spracovanie argumentov
        processPurchasePriceFromArguments(newPurchasePrice, dphOption, materialName);

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        utils.showErrorDialog("Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// SPRACOVANIE ARGUMENTOV
// ==============================================

/**
 * Spracuje nákupnú cenu a DPH option z argumentov akcie
 */
function processPurchasePriceFromArguments(inputPrice, dphOption, materialName) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.info + " Argumenty - nákupná cena: " + inputPrice + ", dph: " + dphOption);

        // Ak nie je zadaná cena alebo je 0, použiť aktuálnu nákupnú cenu z materiálu
        var inputPriceValue = parseFloat(inputPrice);
        if (!inputPrice || inputPrice === "" || isNaN(inputPriceValue) || inputPriceValue === 0) {
            var currentPurchasePrice = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.purchasePrice, 0));
            if (currentPurchasePrice <= 0) {
                utils.showErrorDialog("❌ CHYBA ARGUMENTU\n\nNie je zadaná nákupná cena a v materiáli nie je nastavená žiadna nákupná cena!\n\nNastavte nákupnú cenu v materiáli alebo zadajte hodnotu argumentu.");
                return false;
            }
            inputPriceValue = currentPurchasePrice;
            utils.addDebug(currentEntry, CONFIG.icons.info + " Použitá aktuálna nákupná cena z materiálu: " + utils.formatMoney(inputPriceValue));
        }

        var price={
            purchase: inputPriceValue,
            selling: null,
        }

        // Validácia finálnej ceny
        if (isNaN(price.purchase) || price.purchase < 0) {
            utils.showErrorDialog("❌ CHYBA ARGUMENTU\n\nNákupná cena musí byť číslo väčšie alebo rovné 0!\n\nZadali ste: '" + inputPrice + "'");
            return false;
        }
        
        
        var finalPurchasePrice = price.purchase;
        
        // Ak je zadaná cena s DPH, prepočítaj na cenu bez DPH
        if (dphOption === "s DPH") {
            // Získanie DPH sadzby pre materiál
            var vatRate = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "Základná");
            var vatRatePercentage = utils.getValidVatRate(vatRate, new Date());
            if (vatRatePercentage === null) {
                utils.showErrorDialog("❌ CHYBA DPH\n\nNie je možné získať DPH sadzbu pre materiál!\n\nSkontrolujte nastavenie poľa 'sadzba DPH' v materiáli.");
                return false;
            }

            // Prepočet ceny bez DPH: cena s DPH / (1 + sadzba DPH)
            var vatMultiplier = 1 + (vatRatePercentage / 100);
            finalPurchasePrice = price.purchase / vatMultiplier;

            utils.addDebug(currentEntry, CONFIG.icons.calculation + " Prepočet z ceny s DPH:");
            utils.addDebug(currentEntry, "  • Zadaná cena s DPH: " + utils.formatMoney(price.purchase));
            utils.addDebug(currentEntry, "  • DPH sadzba: " + vatRatePercentage + "%");
            utils.addDebug(currentEntry, "  • Prepočítaná cena bez DPH: " + utils.formatMoney(finalPurchasePrice));
        } else {
            utils.addDebug(currentEntry, CONFIG.icons.money + " Nákupná cena bez DPH (priamo zadaná): " + utils.formatMoney(finalPurchasePrice));
        }

        // Priamo vykonáme prepočet s finálnou cenou bez DPH
        executeCalculation(finalPurchasePrice, materialName);

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri spracovaní argumentov", "processPurchasePriceFromArguments", error);
        utils.showErrorDialog("Chyba pri spracovaní argumentov!\n\n" + error.toString());
        return false;
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
            new Date(), // Použije aktuálny dátum
            true // isManualAction = true (ide o manuálny prepočet)
        );

        if (result && result.sellingPrice !== undefined) {
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

            utils.showSuccessDialog(successMessage);

        } else {
            // Prepočet zlyhal
            utils.addError(currentEntry, "Prepočet cien zlyhal", "executeCalculation");
            utils.addError(currentEntry, "Result object: " + JSON.stringify(result), "executeCalculation");
            utils.showErrorDialog("❌ CHYBA PREPOČTU\n\nPrepočet cien sa nepodarilo dokončiť.\n\nSkontrolujte nastavenia materiálu a skúste znova.");
        }

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri vykonávaní prepočtu", "executeCalculation", error);
        utils.showErrorDialog("Kritická chyba pri prepočte!\n\n" + error.toString());
    }
}

// ==============================================
// POZNÁMKA: Dialógové funkcie boli presunuté do MementoCore7.js
// a sú dostupné cez utils.showErrorDialog() a utils.showSuccessDialog()
// ==============================================


// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();