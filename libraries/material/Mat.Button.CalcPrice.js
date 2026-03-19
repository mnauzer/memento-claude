// ==============================================
// MEMENTO DATABASE - MATERIÁL PREPOČET CENY BUTTON
// Verzia: 1.0.0 | Dátum: September 2025 | Autor: ASISTANTO
// Knižnica: Materiál | Trigger: Button Script
// ==============================================
// 📋 FUNKCIA:
//    - Prepočet cien materiálu priamo z button v zázname
//    - Používa hodnoty priamo z polí materiálu (bez argumentov)
//    - Automatický prepočet predajných cien podľa nastavení
//    - Aktualizácia ikon podľa zmeny ceny
//    - Automatické vytvorenie/aktualizácia cenovej histórie
// ==============================================
// 🔧 POUŽÍVA:
//    - MementoUtils v7.0 (agregátor)
//    - MementoConfig (centrálna konfigurácia)
//    - MementoBusiness (business logika pre ceny materiálu)
//    - MementoCore (dialógy, logging)
// 📝 VSTUPNÉ HODNOTY (z polí záznamu):
//    - "Nákupná cena" - Nákupná cena materiálu bez DPH
//    - "Prepočet ceny" - Spôsob prepočtu (Pevná cena/Podľa prirážky/Neprepočítavať)
//    - "Obchodná prirážka" - Percentuálna prirážka
//    - Ostatné nastavenia zaokrúhľovania a DPH
// ==============================================

// ==============================================
// INICIALIZÁCIA
// ==============================================

var utils = MementoUtils;
var config = utils.getConfig();
var centralConfig = utils.config;
var currentEntry = entry();

var CONFIG = {
    scriptName: "Materiál Prepočet ceny Button",
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

        // Získanie názvu materiálu
        var materialName = utils.safeGet(currentEntry, CONFIG.materialFields.name, "Neznámy materiál");
        utils.addDebug(currentEntry, CONFIG.icons.material + " Materiál: " + materialName);

        // Načítanie vstupných hodnôt z polí záznamu
        var inputData = loadInputDataFromRecord();
        if (!inputData.isValid) {
            utils.showErrorDialog("❌ CHYBA VSTUPNÝCH ÚDAJOV\n\n" + inputData.errorMessage);
            return false;
        }

        utils.addDebug(currentEntry, CONFIG.icons.info + " Vstupné údaje úspešne načítané");
        utils.addDebug(currentEntry, "  • Nákupná cena: " + utils.formatMoney(inputData.purchasePrice));
        utils.addDebug(currentEntry, "  • Prepočet ceny: " + inputData.priceCalculation);

        // Vykonanie prepočtu
        executeCalculation(inputData.purchasePrice, materialName);

        return true;

    } catch (error) {
        utils.addError(currentEntry, "Kritická chyba v hlavnej funkcii", "main", error);
        utils.showErrorDialog("Kritická chyba!\n\n" + error.toString());
        return false;
    }
}

// ==============================================
// NAČÍTANIE VSTUPNÝCH ÚDAJOV
// ==============================================

/**
 * Načíta vstupné údaje priamo z polí záznamu
 */
function loadInputDataFromRecord() {
    try {
        var inputData = {
            purchasePrice: 0,
            priceCalculation: "",
            isValid: true,
            errorMessage: ""
        };

        // Načítanie nákupnej ceny
        var purchasePriceValue = utils.safeGet(currentEntry, CONFIG.materialFields.purchasePrice, 0);
        inputData.purchasePrice = parseFloat(purchasePriceValue) || 0;

        // Načítanie spôsobu prepočtu
        inputData.priceCalculation = utils.safeGet(currentEntry, CONFIG.materialFields.priceCalculation, "").trim();

        // Validácia nákupnej ceny
        if (inputData.purchasePrice <= 0) {
            inputData.isValid = false;
            inputData.errorMessage = "Nákupná cena nie je nastavená alebo je nulová!\n\nNastavte nákupnú cenu materiálu v poli '" + CONFIG.materialFields.purchasePrice + "'.";
            return inputData;
        }

        // Validácia spôsobu prepočtu
        if (!inputData.priceCalculation || inputData.priceCalculation === "") {
            inputData.isValid = false;
            inputData.errorMessage = "Spôsob prepočtu nie je nastavený!\n\nNastavte hodnotu v poli '" + CONFIG.materialFields.priceCalculation + "'.";
            return inputData;
        }

        // Pre "Podľa prirážky" kontrola obchodnej prirážky
        if (inputData.priceCalculation === "Podľa prirážky") {
            var markupPercentage = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.markupPercentage, 0));
            if (markupPercentage <= 0) {
                inputData.isValid = false;
                inputData.errorMessage = "Pre prepočet 'Podľa prirážky' nie je nastavená obchodná prirážka!\n\nNastavte hodnotu v poli '" + CONFIG.materialFields.markupPercentage + "'.";
                return inputData;
            }
            utils.addDebug(currentEntry, CONFIG.icons.info + " Obchodná prirážka: " + markupPercentage + "%");
        }

        utils.addDebug(currentEntry, CONFIG.icons.success + " Vstupné údaje validované");
        return inputData;

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri načítavaní vstupných údajov", "loadInputDataFromRecord", error);
        return {
            isValid: false,
            errorMessage: "Chyba pri spracovaní vstupných údajov: " + error.toString()
        };
    }
}

// ==============================================
// VYKONANIE PREPOČTU
// ==============================================

/**
 * Vykoná skutočný prepočet cien
 */
function executeCalculation(purchasePrice, materialName) {
    try {
        utils.addDebug(currentEntry, CONFIG.icons.calculation + " Spúšťam prepočet cien...");

        // Použitie funkcie z MementoBusiness modulu s vynúteným prepočtom
        var result = utils.calculateAndUpdateMaterialPrices(
            currentEntry,
            purchasePrice,
            new Date(), // Použije aktuálny dátum
            true, // isManualAction = true (ide o manuálny prepočet)
            { forceRecalculation: true } // Vynútiť prepočet bez ohľadu na prahy
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
// VALIDÁCIA NASTAVENÍ MATERIÁLU
// ==============================================

/**
 * Skontroluje či sú všetky potrebné polia nastavené
 */
function validateMaterialSettings() {
    try {
        var issues = [];

        // Kontrola DPH sadzby
        var vatRate = utils.safeGet(currentEntry, CONFIG.materialFields.vatRate, "");
        if (!vatRate || vatRate.trim() === "") {
            issues.push("• Nie je nastavená sadzba DPH");
        }

        // Kontrola prepočtu ceny
        var priceCalculation = utils.safeGet(currentEntry, CONFIG.materialFields.priceCalculation, "");
        if (!priceCalculation || priceCalculation.trim() === "") {
            issues.push("• Nie je nastavený spôsob prepočtu ceny");
        }

        // Pre "Podľa prirážky" kontrola obchodnej prirážky
        if (priceCalculation === "Podľa prirážky") {
            var markupPercentage = parseFloat(utils.safeGet(currentEntry, CONFIG.materialFields.markupPercentage, 0));
            if (markupPercentage <= 0) {
                issues.push("• Nie je nastavená obchodná prirážka pre prepočet 'Podľa prirážky'");
            }
        }

        if (issues.length > 0) {
            var warningMessage = "⚠️ UPOZORNENIE NA NASTAVENIA\n\n";
            warningMessage += "Niektoré nastavenia materiálu môžu ovplyvniť prepočet:\n\n";
            warningMessage += issues.join("\n");
            warningMessage += "\n\nChcete pokračovať v prepočte?";

            // Pre button script len upozornenie, neprerušujeme
            utils.addDebug(currentEntry, CONFIG.icons.warning + " Upozornenia na nastavenia: " + issues.length);
        }

        return {
            hasIssues: issues.length > 0,
            issues: issues
        };

    } catch (error) {
        utils.addError(currentEntry, "Chyba pri validácii nastavení", "validateMaterialSettings", error);
        return {
            hasIssues: false,
            issues: []
        };
    }
}

// ==============================================
// SPUSTENIE SCRIPTU
// ==============================================

main();