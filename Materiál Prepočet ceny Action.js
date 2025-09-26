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

        // Validácia argumentov
        if (newPurchasePrice === null || newPurchasePrice === undefined || newPurchasePrice === "") {
            showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'nákupná cena' nie je zadaný!\\n\\nPre spustenie akcie je potrebné zadať hodnotu argumentu.");
            return false;
        }

        if (dphOption === null || dphOption === undefined || dphOption === "") {
            showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'dph' nie je zadaný!\\n\\nVyberte: 's DPH' alebo 'bez DPH'.");
            return false;
        }

        // Validácia hodnoty DPH argumentu
        if (dphOption !== "s DPH" && dphOption !== "bez DPH") {
            showErrorDialog("❌ CHYBA ARGUMENTU\\n\\nArgument 'dph' má neplatnú hodnotu: '" + dphOption + "'\\n\\nPovolené hodnoty: 's DPH', 'bez DPH'.");
            return false;
        }

        // Spracovanie argumentov
        processPurchasePriceFromArguments(newPurchasePrice, dphOption, materialName);

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        showErrorDialog("Kritická chyba!\n\n" + error.toString());
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

        // Validácia vstupu ceny
        var inputPurchasePrice = parseFloat(inputPrice);
        if (isNaN(inputPurchasePrice) || inputPurchasePrice < 0) {
            showErrorDialog("❌ CHYBA ARGUMENTU\n\nNákupná cena musí byť číslo väčšie alebo rovné 0!\n\nZadali ste: '" + inputPrice + "'");
            return false;
        }

        var finalPurchasePrice = inputPurchasePrice;

        // Ak je zadaná cena s DPH, prepočítaj na cenu bez DPH
        if (dphOption === "s DPH") {
            // Získanie DPH sadzby pre materiál
            var vatRatePercentage = getVatRateForMaterial();
            if (vatRatePercentage === null) {
                showErrorDialog("❌ CHYBA DPH\n\nNie je možné získať DPH sadzbu pre materiál!\n\nSkontrolujte nastavenie poľa 'sadzba DPH' v materiáli.");
                return false;
            }

            // Prepočet ceny bez DPH: cena s DPH / (1 + sadzba DPH)
            var vatMultiplier = 1 + (vatRatePercentage / 100);
            finalPurchasePrice = inputPurchasePrice / vatMultiplier;

            utils.addDebug(currentEntry, CONFIG.icons.calculation + " Prepočet z ceny s DPH:");
            utils.addDebug(currentEntry, "  • Zadaná cena s DPH: " + utils.formatMoney(inputPurchasePrice));
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
        showErrorDialog("Chyba pri spracovaní argumentov!\n\n" + error.toString());
        return false;
    }
}

/**
 * Získa DPH sadzbu pre aktuálny materiál
 * @returns {number|null} DPH sadzba v percentách alebo null pri chybe
 */
function getVatRateForMaterial() {
    try {
        var vatRateType = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "");

        if (!vatRateType || vatRateType.trim() === "") {
            utils.addDebug(currentEntry, CONFIG.icons.warning + " DPH sadzba nie je nastavená, použije sa základná sadzba");
            return 20; // Základná sadzba 20% ako fallback
        }

        // Získanie knižnice DPH sadzieb
        var vatLibraryName = CONFIG.libraries.vatRates;
        var vatLibrary = libByName(vatLibraryName);

        if (!vatLibrary) {
            utils.addError(currentEntry, "Knižnica DPH sadzieb neexistuje", "getVatRateForMaterial");
            return 20; // Fallback na základnú sadzbu
        }

        // Hľadanie záznamu DPH sadzby
        var vatEntries = vatLibrary.entries();
        for (var i = 0; i < vatEntries.length; i++) {
            var vatEntry = vatEntries[i];
            var entryName = utils.safeGet(vatEntry, (centralConfig.fields.vatRates && centralConfig.fields.vatRates.name) || "Názov", "");

            if (entryName === vatRateType) {
                var rate = parseFloat(utils.safeGet(vatEntry, (centralConfig.fields.vatRates && centralConfig.fields.vatRates.rate) || "Sadzba", 0));
                utils.addDebug(currentEntry, CONFIG.icons.info + " Nájdená DPH sadzba: " + entryName + " = " + rate + "%");
                return rate;
            }
        }

        // Ak sa nenašla konkrétna sadzba, skús parsovať číslo z názvu
        var rateFromName = parseFloat(vatRateType);
        if (!isNaN(rateFromName) && rateFromName >= 0) {
            utils.addDebug(currentEntry, CONFIG.icons.info + " Parsovaná DPH sadzba z názvu: " + rateFromName + "%");
            return rateFromName;
        }

        utils.addError(currentEntry, "Nepodarilo sa určiť DPH sadzbu pre typ: " + vatRateType, "getVatRateForMaterial");
        return 20; // Fallback na základnú sadzbu

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri získavaní DPH sadzby", "getVatRateForMaterial", error);
        return 20; // Fallback na základnú sadzbu
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


// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();